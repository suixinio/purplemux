import { create } from 'zustand';

interface ITabMetadata {
  title?: string;
  cwd?: string;
}

interface ITabMetadataState {
  metadata: Record<string, ITabMetadata>;
  setTitle: (tabId: string, title: string) => void;
  setCwd: (tabId: string, cwd: string) => void;
  removeTab: (tabId: string) => void;
  hydrate: (data: Record<string, ITabMetadata>) => void;
  retainOnly: (tabIds: Set<string>) => void;
  reset: () => void;
}

const SYNC_DEBOUNCE_MS = 100;

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _layoutSyncFn: ((metadata: Record<string, ITabMetadata>) => void) | null = null;
let _directorySyncFn: ((cwds: string[]) => void) | null = null;
let _prevCwdsKey = '';

const scheduleSyncToLayout = () => {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    _syncTimer = null;
    const { metadata } = useTabMetadataStore.getState();
    _layoutSyncFn?.(metadata);
    syncDirectories(metadata);
  }, SYNC_DEBOUNCE_MS);
};

const syncDirectories = (metadata: Record<string, ITabMetadata>) => {
  const cwds = [...new Set(
    Object.values(metadata)
      .map((m) => m.cwd)
      .filter((c): c is string => !!c),
  )];
  const key = cwds.join('\0');
  if (key !== _prevCwdsKey) {
    _prevCwdsKey = key;
    _directorySyncFn?.(cwds);
  }
};

const useTabMetadataStore = create<ITabMetadataState>((set) => ({
  metadata: {},

  setTitle: (tabId, title) => {
    set((state) => {
      const prev = state.metadata[tabId];
      if (prev?.title === title) return state;
      return { metadata: { ...state.metadata, [tabId]: { ...prev, title } } };
    });
    scheduleSyncToLayout();
  },

  setCwd: (tabId, cwd) => {
    set((state) => {
      const prev = state.metadata[tabId];
      if (prev?.cwd === cwd) return state;
      return { metadata: { ...state.metadata, [tabId]: { ...prev, cwd } } };
    });
    scheduleSyncToLayout();
  },

  removeTab: (tabId) => {
    set((state) => {
      const { [tabId]: _removed, ...rest } = state.metadata; // eslint-disable-line @typescript-eslint/no-unused-vars
      return { metadata: rest };
    });
    scheduleSyncToLayout();
  },

  hydrate: (data) => {
    set({ metadata: data });
    _prevCwdsKey = '';
  },

  retainOnly: (tabIds) => {
    set((state) => {
      const next: Record<string, ITabMetadata> = {};
      for (const id of tabIds) {
        if (state.metadata[id]) next[id] = state.metadata[id];
      }
      return { metadata: next };
    });
    scheduleSyncToLayout();
  },

  reset: () => {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = null;
    _prevCwdsKey = '';
    set({ metadata: {} });
  },
}));

export const setLayoutSyncCallback = (fn: ((metadata: Record<string, ITabMetadata>) => void) | null): void => {
  _layoutSyncFn = fn;
};

export const setDirectorySyncCallback = (fn: ((cwds: string[]) => void) | null): void => {
  _directorySyncFn = fn;
};

export type { ITabMetadata };
export default useTabMetadataStore;
