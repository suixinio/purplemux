import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import AppHeader from '@/components/layout/app-header';
import MobileNavigationSheet from '@/components/features/mobile/mobile-navigation-sheet';
import useWorkspaceStore from '@/hooks/use-workspace-store';
import { collectPanes } from '@/hooks/use-layout';
import type { ILayoutData, IPaneNode, ITab } from '@/types/terminal';

interface IMobileLayoutProps {
  children: ReactNode;
  onSelectWorkspace: (workspaceId: string) => void;
  panes?: IPaneNode[];
  activePaneId?: string | null;
  activeTabId?: string | null;
  onSelectSurface?: (paneId: string, tabId: string) => void;
  onCreateTab?: (paneId: string) => Promise<ITab | null>;
  onDeleteTab?: (paneId: string, tabId: string) => Promise<void>;
}

const MobileLayout = ({
  children,
  onSelectWorkspace,
  panes: externalPanes,
  activePaneId,
  activeTabId,
  onSelectSurface,
  onCreateTab,
  onDeleteTab,
}: IMobileLayoutProps) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const isLoading = useWorkspaceStore((s) => s.isLoading);

  const [fetchedLayout, setFetchedLayout] = useState<ILayoutData | null>(null);

  useEffect(() => {
    if (workspaces.length === 0) {
      useWorkspaceStore.getState().fetchWorkspaces();
    }
  }, [workspaces.length]);

  useEffect(() => {
    if (externalPanes || !activeWorkspaceId) {
      setFetchedLayout(null);
      return;
    }
    let cancelled = false;
    const fetchLayout = async () => {
      try {
        const res = await fetch(`/api/layout?workspace=${activeWorkspaceId}`);
        if (!res.ok) return;
        const data: ILayoutData = await res.json();
        if (!cancelled) setFetchedLayout(data);
      } catch {
        // ignore
      }
    };
    fetchLayout();
    return () => { cancelled = true; };
  }, [activeWorkspaceId, externalPanes]);

  const fallbackPanes = useMemo(() => {
    if (!fetchedLayout) return [];
    return collectPanes(fetchedLayout.root);
  }, [fetchedLayout]);

  const panes = externalPanes ?? fallbackPanes;

  const handleSelectSurface = useCallback(
    (paneId: string, tabId: string) => {
      if (onSelectSurface) {
        onSelectSurface(paneId, tabId);
      } else {
        router.push('/');
      }
    },
    [onSelectSurface, router],
  );

  const handleCreateWorkspace = useCallback(async () => {
    const ws = await useWorkspaceStore.getState().createWorkspace('');
    if (ws) {
      setMenuOpen(false);
      onSelectWorkspace(ws.id);
    }
  }, [onSelectWorkspace]);

  return (
    <>
      <div style={{ paddingTop: 'env(safe-area-inset-top)' }} className="shrink-0">
        <AppHeader onMenuOpen={() => setMenuOpen(true)} />
      </div>
      {children}
      <MobileNavigationSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        panes={panes}
        activePaneId={activePaneId}
        activeTabId={activeTabId}
        onSelectWorkspace={onSelectWorkspace}
        onSelectSurface={handleSelectSurface}
        onCreateTab={onCreateTab}
        onDeleteTab={onDeleteTab}
        onCreateWorkspace={handleCreateWorkspace}
      />
    </>
  );
};

export default MobileLayout;
