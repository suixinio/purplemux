import { create } from 'zustand';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import type { IWorkspace } from '@/types/terminal';

interface IValidateResponse {
  valid: boolean;
  error?: string;
  suggestedName?: string;
}

export interface IWorkspaceInitialData {
  workspaces: IWorkspace[];
  activeWorkspaceId?: string;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
}

interface IWorkspaceState {
  workspaces: IWorkspace[];
  activeWorkspaceId: string | null;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  sidebarTab: 'workspace' | 'sessions';
  isSettingsDialogOpen: boolean;
  isCheatSheetOpen: boolean;
  isLoading: boolean;
  error: string | null;
  pendingDeleteIds: Set<string>;

  hydrate: (data: IWorkspaceInitialData) => void;
  fetchWorkspaces: () => Promise<void>;
  syncWorkspaces: () => Promise<void>;
  createWorkspace: (directory: string, name?: string, resumeSessionId?: string) => Promise<IWorkspace | null>;
  deleteWorkspace: (workspaceId: string) => Promise<boolean>;
  removeWorkspace: (workspaceId: string) => void;
  markPendingDelete: (workspaceId: string) => void;
  unmarkPendingDelete: (workspaceId: string) => void;
  switchWorkspace: (workspaceId: string) => void;
  renameWorkspace: (workspaceId: string, name: string) => Promise<boolean>;
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  saveSidebarWidth: (width: number) => void;
  setSidebarTab: (tab: 'workspace' | 'sessions') => void;
  setSettingsDialogOpen: (open: boolean) => void;
  setCheatSheetOpen: (open: boolean) => void;
  validateDirectory: (directory: string) => Promise<IValidateResponse>;
}

const getInitialSidebar = (): { sidebarWidth: number; sidebarCollapsed: boolean; sidebarTab: 'workspace' | 'sessions' } => {
  if (typeof window !== 'undefined') {
    const sb = (window as unknown as Record<string, unknown>).__SB__ as { w: number; c: boolean; t?: string } | undefined;
    if (sb) return { sidebarWidth: sb.w, sidebarCollapsed: sb.c, sidebarTab: sb.t === 'sessions' ? 'sessions' : 'workspace' };
  }
  return { sidebarWidth: 240, sidebarCollapsed: false, sidebarTab: 'workspace' };
};

const initialSidebar = getInitialSidebar();

const getInitialWorkspaceData = (): { workspaces: IWorkspace[]; activeWorkspaceId: string | null; isLoading: boolean } => {
  return { workspaces: [], activeWorkspaceId: null, isLoading: true };
};

const initialWs = getInitialWorkspaceData();

const getStoredActiveWorkspaceId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const sb = (window as unknown as Record<string, unknown>).__SB__ as { a?: string } | undefined;
  return sb?.a ?? null;
};

const setStoredActiveWorkspaceId = (id: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      sessionStorage.setItem('active-ws', id);
    } else {
      sessionStorage.removeItem('active-ws');
    }
  } catch { /* */ }
};

const saveActiveWorkspaceIdToServer = (id: string) => {
  fetch('/api/workspace/active', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeWorkspaceId: id }),
  }).catch(() => { /* */ });
};

const resolveActiveWorkspaceId = (workspaces: IWorkspace[], serverActiveId?: string): string | null => {
  const stored = getStoredActiveWorkspaceId();
  if (stored && workspaces.some((w) => w.id === stored)) return stored;
  if (serverActiveId && workspaces.some((w) => w.id === serverActiveId)) return serverActiveId;
  return workspaces[0]?.id ?? null;
};

const saveActive = (updates: {
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
}) => {
  fetch('/api/workspace/active', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  }).catch((err) => {
    console.log(`[workspace-store] active update failed: ${err instanceof Error ? err.message : err}`);
  });
};

let syncTicketCounter = 0;
let lastAppliedSyncTicket = 0;
let mutationFenceTicket = 0;

const bumpMutationFence = () => {
  mutationFenceTicket = syncTicketCounter;
};

const useWorkspaceStore = create<IWorkspaceState>((set, get) => ({
  workspaces: initialWs.workspaces,
  activeWorkspaceId: initialWs.workspaces.length > 0 ? resolveActiveWorkspaceId(initialWs.workspaces) : null,
  sidebarCollapsed: initialSidebar.sidebarCollapsed,
  sidebarWidth: initialSidebar.sidebarWidth,
  sidebarTab: initialSidebar.sidebarTab,
  isSettingsDialogOpen: false,
  isCheatSheetOpen: false,
  isLoading: initialWs.isLoading,
  error: null,
  pendingDeleteIds: new Set<string>(),

  hydrate: (data) => {
    const activeWorkspaceId = resolveActiveWorkspaceId(data.workspaces, data.activeWorkspaceId);
    setStoredActiveWorkspaceId(activeWorkspaceId);
    if (activeWorkspaceId) saveActiveWorkspaceIdToServer(activeWorkspaceId);
    set({
      workspaces: data.workspaces,
      activeWorkspaceId,
      sidebarCollapsed: data.sidebarCollapsed,
      sidebarWidth: data.sidebarWidth,
      isLoading: false,
      error: null,
    });
  },

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/workspace');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const activeWorkspaceId = resolveActiveWorkspaceId(data.workspaces, data.activeWorkspaceId);
      setStoredActiveWorkspaceId(activeWorkspaceId);
      set({
        workspaces: data.workspaces,
        activeWorkspaceId,
        sidebarCollapsed: data.sidebarCollapsed ?? false,
        sidebarWidth: data.sidebarWidth ?? 240,
        isLoading: false,
      });
    } catch {
      set({ error: t('workspace', 'fetchError'), isLoading: false });
    }
  },

  syncWorkspaces: async () => {
    const myTicket = ++syncTicketCounter;
    try {
      const res = await fetch('/api/workspace');
      if (!res.ok) return;
      const data = await res.json();
      if (myTicket < lastAppliedSyncTicket || myTicket <= mutationFenceTicket) return;
      lastAppliedSyncTicket = myTicket;

      const current = get().workspaces;
      const pending = get().pendingDeleteIds;
      const serverList: IWorkspace[] = data.workspaces;
      const serverMap = new Map<string, IWorkspace>(serverList.map((w) => [w.id, w]));

      const merged: IWorkspace[] = [];
      const seen = new Set<string>();
      for (const w of current) {
        const updated = serverMap.get(w.id);
        if (updated) {
          merged.push(updated);
          seen.add(w.id);
        } else if (pending.has(w.id)) {
          merged.push(w);
          seen.add(w.id);
        }
      }
      for (const w of serverList) {
        if (seen.has(w.id)) continue;
        if (pending.has(w.id)) continue;
        merged.push(w);
      }

      if (JSON.stringify(current) === JSON.stringify(merged)) return;
      set({ workspaces: merged });
    } catch (err) {
      console.log(`[workspace-store] sync error: ${err instanceof Error ? err.message : err}`);
    }
  },

  createWorkspace: async (directory, name?, resumeSessionId?) => {
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory, name, resumeSessionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('workspace', 'createFailed'));
      }
      const ws: IWorkspace = await res.json();
      bumpMutationFence();
      set((state) => ({
        workspaces: state.workspaces.some((w) => w.id === ws.id)
          ? state.workspaces
          : [...state.workspaces, ws],
      }));
      return ws;
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('workspace', 'createFailed');
      toast.error(msg);
      return null;
    }
  },

  deleteWorkspace: async (workspaceId) => {
    try {
      const res = await fetch(`/api/workspace/${workspaceId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error();
      bumpMutationFence();
      return true;
    } catch {
      toast.error(t('workspace', 'deleteFailed'));
      return false;
    }
  },

  removeWorkspace: (workspaceId) => {
    set((state) => {
      const remaining = state.workspaces.filter((w) => w.id !== workspaceId);
      const needSwitch = state.activeWorkspaceId === workspaceId;
      const activeWorkspaceId = needSwitch ? (remaining[0]?.id ?? null) : state.activeWorkspaceId;
      if (needSwitch) {
        setStoredActiveWorkspaceId(activeWorkspaceId);
        if (activeWorkspaceId) saveActiveWorkspaceIdToServer(activeWorkspaceId);
      }
      return { workspaces: remaining, activeWorkspaceId };
    });
  },

  markPendingDelete: (workspaceId) => {
    set((state) => {
      if (state.pendingDeleteIds.has(workspaceId)) return state;
      const next = new Set(state.pendingDeleteIds);
      next.add(workspaceId);
      return { pendingDeleteIds: next };
    });
  },

  unmarkPendingDelete: (workspaceId) => {
    set((state) => {
      if (!state.pendingDeleteIds.has(workspaceId)) return state;
      const next = new Set(state.pendingDeleteIds);
      next.delete(workspaceId);
      return { pendingDeleteIds: next };
    });
  },

  switchWorkspace: (workspaceId) => {
    set({ activeWorkspaceId: workspaceId });
    setStoredActiveWorkspaceId(workspaceId);
    saveActiveWorkspaceIdToServer(workspaceId);
  },

  renameWorkspace: async (workspaceId, name) => {
    const prev = get().workspaces.find((w) => w.id === workspaceId);
    const previousName = prev?.name ?? '';
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, name } : w,
      ),
    }));
    try {
      const res = await fetch(`/api/workspace/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          w.id === workspaceId ? { ...w, name: previousName } : w,
        ),
      }));
      toast.error(t('workspace', 'renameFailed'));
      return false;
    }
  },

  reorderWorkspaces: (fromIndex, toIndex) => {
    const list = [...get().workspaces];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    set({ workspaces: list });

    fetch('/api/workspace/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceIds: list.map((w) => w.id) }),
    }).catch(() => {
      toast.error(t('workspace', 'reorderFailed'));
      get().fetchWorkspaces();
    });
  },

  toggleSidebar: () => {
    set((state) => {
      const next = !state.sidebarCollapsed;
      saveActive({ sidebarCollapsed: next });
      return { sidebarCollapsed: next };
    });
  },

  setSidebarWidth: (width) => {
    set({ sidebarWidth: width });
  },

  saveSidebarWidth: (width) => {
    saveActive({ sidebarWidth: width });
  },

  setSidebarTab: (tab) => {
    set({ sidebarTab: tab });
    try { localStorage.setItem('sidebar-tab', tab); } catch { /* */ }
  },

  setSettingsDialogOpen: (open) => {
    set({ isSettingsDialogOpen: open });
  },

  setCheatSheetOpen: (open) => {
    set({ isCheatSheetOpen: open });
  },

  validateDirectory: async (directory) => {
    try {
      const res = await fetch(
        `/api/workspace/validate?directory=${encodeURIComponent(directory)}`,
      );
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return { valid: false, error: t('workspace', 'validateFailed') };
    }
  },
}));

export default useWorkspaceStore;
