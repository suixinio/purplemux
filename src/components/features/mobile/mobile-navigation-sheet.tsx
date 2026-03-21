import { useState, useCallback } from 'react';
import { ChevronRight, Plus, Loader2, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { IWorkspace, IPaneNode, ITab } from '@/types/terminal';
import useTabMetadataStore from '@/hooks/use-tab-metadata-store';

interface IMobileNavigationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: IWorkspace[];
  activeWorkspaceId: string | null;
  panes: IPaneNode[];
  activePaneId: string | null;
  activeTabId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectSurface: (paneId: string, tabId: string) => void;
  onCreateTab: (paneId: string) => Promise<ITab | null>;
}

const MobileNavigationSheet = ({
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  panes,
  activePaneId,
  activeTabId,
  onSelectWorkspace,
  onSelectSurface,
  onCreateTab,
}: IMobileNavigationSheetProps) => {
  const router = useRouter();
  const [creatingPaneId, setCreatingPaneId] = useState<string | null>(null);
  const metadata = useTabMetadataStore((s) => s.metadata);

  const handleSelectWorkspace = useCallback(
    (workspaceId: string) => {
      onSelectWorkspace(workspaceId);
      onOpenChange(false);
    },
    [onSelectWorkspace, onOpenChange],
  );

  const handleSelectSurface = useCallback(
    (paneId: string, tabId: string) => {
      onSelectSurface(paneId, tabId);
      onOpenChange(false);
    },
    [onSelectSurface, onOpenChange],
  );

  const handleCreateTab = useCallback(
    async (paneId: string) => {
      if (creatingPaneId) return;
      setCreatingPaneId(paneId);
      const tab = await onCreateTab(paneId);
      setCreatingPaneId(null);
      if (tab) {
        onSelectSurface(paneId, tab.id);
        onOpenChange(false);
      }
    },
    [creatingPaneId, onCreateTab, onSelectSurface, onOpenChange],
  );

  const getTabDisplayName = (tab: ITab) => {
    if (tab.name) return tab.name;
    const meta = metadata[tab.id];
    if (meta?.title) return meta.title;
    return `Tab ${tab.order + 1}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm font-semibold">탐색</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspaceId;
            return (
              <div key={ws.id}>
                <button
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50',
                  )}
                  onClick={() => handleSelectWorkspace(ws.id)}
                >
                  <ChevronRight
                    size={14}
                    className={cn(
                      'shrink-0 transition-transform',
                      isActive && 'rotate-90',
                    )}
                  />
                  <span className="truncate">{ws.name}</span>
                </button>

                {isActive && panes.map((pane) => (
                  <div key={pane.id} className="pb-1">
                    {pane.tabs
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((tab) => {
                        const isTabActive =
                          pane.id === activePaneId && tab.id === activeTabId;
                        return (
                          <button
                            key={tab.id}
                            className={cn(
                              'flex w-full items-center px-4 py-2 pl-10 text-left text-sm transition-colors',
                              isTabActive
                                ? 'bg-ui-purple/10 text-foreground'
                                : 'text-muted-foreground hover:bg-accent/50',
                            )}
                            onClick={() => handleSelectSurface(pane.id, tab.id)}
                          >
                            <span className="truncate">{getTabDisplayName(tab)}</span>
                          </button>
                        );
                      })}

                    <button
                      className="flex w-full items-center gap-1.5 px-4 py-1.5 pl-10 text-left text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                      onClick={() => handleCreateTab(pane.id)}
                      disabled={!!creatingPaneId}
                    >
                      {creatingPaneId === pane.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      새 탭
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t">
          <div className="flex items-center gap-1 px-3 py-2">
            <button
              className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent"
              onClick={() => {
                onOpenChange(false);
                router.push('/stats');
              }}
              aria-label="사용량 통계"
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavigationSheet;
