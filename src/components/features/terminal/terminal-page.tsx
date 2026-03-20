import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import useLayout, { collectPanes } from '@/hooks/use-layout';
import useWorkspace, { type IWorkspaceInitialData } from '@/hooks/use-workspace';
import useKeyboardShortcuts from '@/hooks/use-keyboard-shortcuts';
import useTabMetadataStore, { setLayoutSyncCallback, setDirectorySyncCallback } from '@/hooks/use-tab-metadata-store';
import type { ITabMetadata } from '@/hooks/use-tab-metadata-store';
import PaneLayout from '@/components/features/terminal/pane-layout';
import Sidebar from '@/components/features/terminal/sidebar';

interface ITerminalPageProps {
  initialWorkspace?: IWorkspaceInitialData;
}

const TerminalPage = ({ initialWorkspace }: ITerminalPageProps) => {
  const ws = useWorkspace(initialWorkspace);
  const prevWorkspaceIdRef = useRef<string | null>(null);
  const switchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fadeOut, setFadeOut] = useState(false);

  const handleFetchError = useCallback(() => {
    const prevId = prevWorkspaceIdRef.current;
    if (prevId) {
      ws.switchWorkspace(prevId);
      toast.error('전환할 수 없습니다');
    }
  }, [ws]);

  const layout = useLayout({
    workspaceId: ws.activeWorkspaceId,
    onFetchError: handleFetchError,
  });

  const allTabsEmpty = !!(
    layout.layout &&
    !layout.isLoading &&
    collectPanes(layout.layout.root).every((p) => p.tabs.length === 0)
  );

  const wsRef = useRef(ws);
  useEffect(() => {
    wsRef.current = ws;
  });

  // Hydrate store from layout data
  const layoutUpdatedAt = layout.layout?.updatedAt;
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!layout.layout || !layoutUpdatedAt) return;
    if (hydratedRef.current === layoutUpdatedAt) return;
    hydratedRef.current = layoutUpdatedAt;
    const metadata: Record<string, ITabMetadata> = {};
    for (const pane of collectPanes(layout.layout.root)) {
      for (const tab of pane.tabs) {
        if (tab.title || tab.cwd) {
          metadata[tab.id] = { title: tab.title, cwd: tab.cwd };
        }
      }
    }
    useTabMetadataStore.getState().hydrate(metadata);
  }, [layout.layout, layoutUpdatedAt]);

  // Sync store → layout.json (debounced by store)
  const updateAndSaveRef = useRef(layout.updateAndSave);
  useEffect(() => {
    updateAndSaveRef.current = layout.updateAndSave;
  });

  useEffect(() => {
    setLayoutSyncCallback((allMetadata: Record<string, ITabMetadata>) => {
      updateAndSaveRef.current((data) => {
        for (const pane of collectPanes(data.root)) {
          for (const tab of pane.tabs) {
            const meta = allMetadata[tab.id];
            if (!meta) continue;
            if (meta.title !== undefined) tab.title = meta.title;
            if (meta.cwd !== undefined) tab.cwd = meta.cwd;
          }
        }
        return data;
      });
    });
    return () => setLayoutSyncCallback(null);
  }, []);

  // Sync store cwds → workspace directories
  const wsActiveIdRef = useRef(ws.activeWorkspaceId);
  useEffect(() => {
    wsActiveIdRef.current = ws.activeWorkspaceId;
  });

  useEffect(() => {
    setDirectorySyncCallback((cwds) => {
      const wsId = wsActiveIdRef.current;
      if (wsId && cwds.length > 0) {
        wsRef.current.updateDirectories(wsId, cwds);
      }
    });
    return () => setDirectorySyncCallback(null);
  }, []);

  // Cleanup stale tab metadata
  useEffect(() => {
    if (!layout.layout) return;
    const allTabIds = new Set(
      collectPanes(layout.layout.root).flatMap((p) => p.tabs.map((t) => t.id)),
    );
    useTabMetadataStore.getState().retainOnly(allTabIds);
  }, [layout.layout]);

  useEffect(() => {
    if (!allTabsEmpty) return;

    const { activeWorkspaceId, workspaces, switchWorkspace, deleteWorkspace, removeWorkspace } = wsRef.current;
    if (!activeWorkspaceId) return;

    const idx = workspaces.findIndex((w) => w.id === activeWorkspaceId);
    const adjacent = workspaces[idx + 1] || workspaces[idx - 1];

    layout.clearLayout();
    removeWorkspace(activeWorkspaceId);

    if (adjacent) {
      switchWorkspace(adjacent.id);
    }

    deleteWorkspace(activeWorkspaceId);
  }, [allTabsEmpty, layout.clearLayout]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectWorkspace = useCallback(
    (workspaceId: string) => {
      if (workspaceId === ws.activeWorkspaceId) return;

      prevWorkspaceIdRef.current = ws.activeWorkspaceId;
      layout.saveCurrentLayout();

      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
      setFadeOut(true);
      switchTimeoutRef.current = setTimeout(() => {
        useTabMetadataStore.getState().reset();
        layout.clearLayout();
        ws.switchWorkspace(workspaceId);
        setFadeOut(false);
      }, 100);
    },
    [ws, layout],
  );

  useKeyboardShortcuts({ layout, ws, onSelectWorkspace: handleSelectWorkspace });

  if (ws.isLoading) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-terminal-bg">
        <div className="flex w-[200px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="flex h-9 shrink-0 items-center justify-end border-b border-sidebar-border px-2" />
          <div className="flex flex-col gap-0.5 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded bg-secondary"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex h-[30px] shrink-0 items-center gap-1.5 border-b border-border bg-card px-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-4 w-16 animate-pulse rounded bg-muted"
              />
            ))}
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">연결 중...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (ws.error && !ws.workspaces.length) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 overflow-hidden bg-terminal-bg">
        <AlertTriangle className="h-5 w-5 text-ui-amber" />
        <span className="text-sm text-muted-foreground">{ws.error}</span>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={ws.retry}>
          <RefreshCw className="h-3.5 w-3.5" />
          재시도
        </Button>
      </div>
    );
  }

  const showSwitching = !layout.layout && layout.isLoading && ws.activeWorkspaceId;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-terminal-bg">
      <Sidebar
        workspaces={ws.workspaces}
        activeWorkspaceId={ws.activeWorkspaceId}
        collapsed={ws.sidebarCollapsed}
        width={ws.sidebarWidth}
        isLoading={false}
        error={null}
        onToggleCollapse={ws.toggleSidebar}
        onWidthChange={ws.setSidebarWidth}
        onWidthDragEnd={ws.saveSidebarWidth}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={ws.createWorkspace}
        onDeleteWorkspace={ws.deleteWorkspace}
        onRemoveWorkspace={ws.removeWorkspace}
        onRenameWorkspace={ws.renameWorkspace}
        onRetry={ws.retry}
      />

      <div className="relative min-w-0 flex-1">
        {showSwitching && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-terminal-bg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {layout.error && !layout.isLoading && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <AlertTriangle className="h-5 w-5 text-ui-amber" />
            <span className="text-sm text-muted-foreground">{layout.error}</span>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => layout.retry()}>
              <RefreshCw className="h-3.5 w-3.5" />
              재시도
            </Button>
          </div>
        )}

        {layout.layout && !layout.isLoading && (
          <div
            key={ws.activeWorkspaceId}
            className={`h-full ${fadeOut ? '' : 'animate-in fade-in-0 duration-100'}`}
            style={fadeOut ? { opacity: 0, transition: 'opacity 100ms ease-out' } : undefined}
          >
            <PaneLayout
              root={layout.layout.root}
              focusedPaneId={layout.layout.focusedPaneId}
              paneCount={layout.paneCount}
              canSplit={layout.canSplit}
              isSplitting={layout.isSplitting}
              onSplitPane={layout.splitPane}
              onClosePane={layout.closePane}
              onFocusPane={layout.focusPane}
              onUpdateRatio={layout.updateRatio}
              onMoveTab={layout.moveTab}
              onCreateTab={layout.createTabInPane}
              onDeleteTab={layout.deleteTabInPane}
              onSwitchTab={layout.switchTabInPane}
              onRenameTab={layout.renameTabInPane}
              onReorderTabs={layout.reorderTabsInPane}
              onRemoveTabLocally={layout.removeTabLocally}
              onUpdateTabPanelType={layout.updateTabPanelType}
              onEqualizeRatios={layout.equalizeRatios}
            />
          </div>
        )}

        {!ws.activeWorkspaceId && !ws.isLoading && !ws.error && (
          <div className="flex h-full items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                const created = await ws.createWorkspace('');
                if (created) ws.switchWorkspace(created.id);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              새 Workspace 만들기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalPage;
