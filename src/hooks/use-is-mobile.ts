import { useSyncExternalStore, useCallback } from 'react';

const DEFAULT_BREAKPOINT = 768;

const useIsMobile = (breakpoint: number = DEFAULT_BREAKPOINT): boolean => {
  const query = `(max-width: ${breakpoint - 1}px)`;

  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export default useIsMobile;
