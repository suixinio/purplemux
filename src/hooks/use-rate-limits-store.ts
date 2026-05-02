import { create } from 'zustand';
import type { IRateLimitsCache } from '@/types/status';

interface IRateLimitsStore {
  data: IRateLimitsCache | null;
  setData: (data: IRateLimitsCache) => void;
}

const useRateLimitsStore = create<IRateLimitsStore>((set) => ({
  data: null,
  setData: (data) => set({ data }),
}));

export default useRateLimitsStore;
