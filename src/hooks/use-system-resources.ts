import { useState, useEffect } from 'react';
import isElectron from '@/hooks/use-is-electron';

interface ISystemResources {
  cpu: number;
  memory: { used: number };
  tmuxSessions: number;
}

const getElectronAPI = () =>
  isElectron
    ? (window as unknown as { electronAPI: { getSystemResources: () => Promise<{ cpu: number; memory: { used: number } }> } }).electronAPI
    : null;

const useSystemResources = (intervalMs = 3000) => {
  const [resources, setResources] = useState<ISystemResources | null>(null);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;

    let mounted = true;

    const poll = async () => {
      try {
        const [metrics, tmux] = await Promise.all([
          api.getSystemResources(),
          fetch('/api/system/tmux-sessions').then((r) => r.json()) as Promise<{ count: number }>,
        ]);
        if (mounted) {
          setResources({
            cpu: metrics.cpu,
            memory: metrics.memory,
            tmuxSessions: tmux.count,
          });
        }
      } catch {
        // ignore
      }
    };

    poll();
    const timer = setInterval(poll, intervalMs);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return resources;
};

export default useSystemResources;
