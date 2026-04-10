import { create } from 'zustand';
import type { ISessionHistoryEntry } from '@/types/session-history';

interface ISessionHistoryStore {
  entries: ISessionHistoryEntry[];
  syncFromServer: (entries: ISessionHistoryEntry[]) => void;
  upsertEntry: (entry: ISessionHistoryEntry) => void;
}

const useSessionHistoryStore = create<ISessionHistoryStore>((set) => ({
  entries: [],
  syncFromServer: (entries) => set({ entries }),
  upsertEntry: (entry) =>
    set((state) => {
      const idx = state.entries.findIndex((e) => e.id === entry.id);
      if (idx >= 0) {
        const next = [...state.entries];
        next[idx] = entry;
        return { entries: next };
      }
      return { entries: [entry, ...state.entries] };
    }),
}));

export default useSessionHistoryStore;
