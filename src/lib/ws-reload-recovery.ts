const HARD_RELOAD_REASON_KEY = 'pmux-ws-hard-reload:reason';

const isMobileLike = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
};

export const shouldPromptMobileReloadRecovery = (): boolean => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (document.visibilityState !== 'visible') return false;
  return isMobileLike();
};

export const reloadForReconnectRecovery = (scope: string): void => {
  try {
    sessionStorage.setItem(HARD_RELOAD_REASON_KEY, scope);
  } catch {
    // Storage is best-effort only; the reload itself is the recovery action.
  }
  window.location.reload();
};
