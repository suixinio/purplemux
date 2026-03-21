import type { ISessionMeta } from '@/types/timeline';

interface ICacheEntry {
  meta: ISessionMeta;
  mtime: number;
  cachedAt: number;
}

const CACHE_TTL = 30_000;

export interface IMetaCache {
  get: (sessionId: string) => ISessionMeta | undefined;
  set: (sessionId: string, meta: ISessionMeta, mtime: number) => void;
  isStale: (sessionId: string, currentMtime: number) => boolean;
  clear: () => void;
}

export const createMetaCache = (): IMetaCache => {
  const store = new Map<string, ICacheEntry>();

  const get = (sessionId: string): ISessionMeta | undefined => {
    const entry = store.get(sessionId);
    if (!entry) return undefined;
    if (Date.now() - entry.cachedAt > CACHE_TTL) {
      store.delete(sessionId);
      return undefined;
    }
    return entry.meta;
  };

  const set = (sessionId: string, meta: ISessionMeta, mtime: number) => {
    store.set(sessionId, { meta, mtime, cachedAt: Date.now() });
  };

  const isStale = (sessionId: string, currentMtime: number): boolean => {
    const entry = store.get(sessionId);
    if (!entry) return true;
    if (Date.now() - entry.cachedAt > CACHE_TTL) {
      store.delete(sessionId);
      return true;
    }
    return entry.mtime !== currentMtime;
  };

  const clear = () => {
    store.clear();
  };

  return { get, set, isStale, clear };
};
