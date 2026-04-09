import { create } from 'zustand';
import type { ITaskHistoryEntry } from '@/types/task-history';

interface ITaskHistoryStore {
  entries: ITaskHistoryEntry[];
  syncFromServer: (entries: ITaskHistoryEntry[]) => void;
  upsertEntry: (entry: ITaskHistoryEntry) => void;
}

const useTaskHistoryStore = create<ITaskHistoryStore>((set) => ({
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

export default useTaskHistoryStore;
