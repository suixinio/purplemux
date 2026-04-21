import { useEffect, useState } from 'react';
import { isMac } from '@/lib/keyboard-shortcuts';

const HOLD_MS = 500;

let active = false;
const subscribers = new Set<(next: boolean) => void>();
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;

const setActive = (next: boolean) => {
  if (active === next) return;
  active = next;
  for (const sub of subscribers) sub(next);
};

const clearHold = () => {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
};

const attachListeners = () => {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  const modKey = isMac ? 'Meta' : 'Control';

  window.addEventListener('keydown', (e) => {
    if (e.key !== modKey || holdTimer || active) return;
    holdTimer = setTimeout(() => {
      holdTimer = null;
      setActive(true);
    }, HOLD_MS);
  });

  window.addEventListener('keyup', (e) => {
    if (e.key !== modKey) return;
    clearHold();
    setActive(false);
  });

  window.addEventListener('blur', () => {
    clearHold();
    setActive(false);
  });
};

const useShortcutHints = (): boolean => {
  const [value, setValue] = useState(active);

  useEffect(() => {
    attachListeners();
    subscribers.add(setValue);
    setValue(active);
    return () => {
      subscribers.delete(setValue);
    };
  }, []);

  return value;
};

export default useShortcutHints;
