import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import AppHeader from '@/components/layout/app-header';
import MobileNavigationSheet from '@/components/features/mobile/mobile-navigation-sheet';
import useWorkspaceStore from '@/hooks/use-workspace-store';
import { useLayoutStore, collectPanes } from '@/hooks/use-layout';
import type { ILayoutData, IPaneNode } from '@/types/terminal';

interface IMobileLayoutProps {
  children: ReactNode;
  onSelectWorkspace: (workspaceId: string) => void;
}

const MobileLayout = ({
  children,
  onSelectWorkspace,
}: IMobileLayoutProps) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const storeLayout = useLayoutStore((s) => s.layout);
  const storeWorkspaceId = useLayoutStore((s) => s.workspaceId);

  const [layoutCache, setLayoutCache] = useState<Record<string, ILayoutData>>({});

  useEffect(() => {
    if (workspaces.length === 0) {
      useWorkspaceStore.getState().fetchWorkspaces();
    }
  }, [workspaces.length]);

  // store의 layout을 cache에 반영
  useEffect(() => {
    if (storeLayout && storeWorkspaceId) {
      setLayoutCache((prev) => ({ ...prev, [storeWorkspaceId]: storeLayout }));
    }
  }, [storeLayout, storeWorkspaceId]);

  // 메뉴 열릴 때 모든 workspace 레이아웃 fetch
  useEffect(() => {
    if (!menuOpen) return;
    let cancelled = false;

    const fetchAll = async () => {
      const toFetch = workspaces.filter((ws) => {
        if (ws.id === storeWorkspaceId && storeLayout) return false;
        return !layoutCache[ws.id];
      });
      if (toFetch.length === 0) return;

      const results = await Promise.all(
        toFetch.map(async (ws) => {
          try {
            const res = await fetch(`/api/layout?workspace=${ws.id}`);
            if (!res.ok) return null;
            const data: ILayoutData = await res.json();
            return { id: ws.id, data };
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;
      setLayoutCache((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r) next[r.id] = r.data;
        }
        return next;
      });
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [menuOpen, workspaces, storeWorkspaceId, storeLayout]); // eslint-disable-line react-hooks/exhaustive-deps

  const workspaceLayouts = useMemo(() => {
    const map: Record<string, IPaneNode[]> = {};
    for (const ws of workspaces) {
      const layout = (ws.id === storeWorkspaceId && storeLayout)
        ? storeLayout
        : layoutCache[ws.id];
      map[ws.id] = layout ? collectPanes(layout.root) : [];
    }
    return map;
  }, [workspaces, storeLayout, storeWorkspaceId, layoutCache]);

  const activeLayout = (activeWorkspaceId === storeWorkspaceId && storeLayout)
    ? storeLayout
    : (activeWorkspaceId ? layoutCache[activeWorkspaceId] : null);
  const activePanes = activeWorkspaceId ? (workspaceLayouts[activeWorkspaceId] ?? []) : [];
  const activePaneId = activeLayout?.activePaneId ?? null;
  const activePane = activePanes.find((p) => p.id === activePaneId) ?? activePanes[0];
  const activeTabId = activePane?.activeTabId ?? null;

  const handleSelectSurface = useCallback(
    async (workspaceId: string, paneId: string, tabId: string) => {
      const cachedLayout = (workspaceId === storeWorkspaceId && storeLayout)
        ? storeLayout
        : layoutCache[workspaceId];

      if (cachedLayout) {
        const updated = JSON.parse(JSON.stringify(cachedLayout)) as ILayoutData;
        updated.activePaneId = paneId;
        const panes = collectPanes(updated.root);
        const targetPane = panes.find((p) => p.id === paneId);
        if (targetPane) targetPane.activeTabId = tabId;

        fetch(`/api/layout?workspace=${workspaceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ root: updated.root, activePaneId: paneId }),
        }).catch(() => {});
      }

      if (workspaceId !== activeWorkspaceId) {
        onSelectWorkspace(workspaceId);
      }

      setMenuOpen(false);
      if (router.pathname !== '/') {
        router.push('/');
      }
    },
    [activeWorkspaceId, onSelectWorkspace, router, storeLayout, storeWorkspaceId, layoutCache],
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
        workspaceLayouts={workspaceLayouts}
        activePaneId={activePaneId}
        activeTabId={activeTabId}
        onSelectSurface={handleSelectSurface}
        onCreateWorkspace={handleCreateWorkspace}
      />
    </>
  );
};

export default MobileLayout;
