interface ICacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, ICacheEntry<unknown>>();

const DEFAULT_TTL = 60_000;

export const getCached = <T>(key: string): T | null => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
};

export const setCached = <T>(key: string, data: T, ttl: number = DEFAULT_TTL): void => {
  store.set(key, { data, expiresAt: Date.now() + ttl });
};

export const invalidateCache = (prefix?: string): void => {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};
