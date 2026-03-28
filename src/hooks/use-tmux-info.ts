import { useState, useEffect } from 'react';

interface ITmuxInfo {
  cwd: string | null;
  command: string | null;
  lastCommand: string | null;
  pid: number | null;
  width: number | null;
  height: number | null;
  sessionCreated: number | null;
  sessionName: string;
}

const useTmuxInfo = (sessionName: string, enabled: boolean) => {
  const [info, setInfo] = useState<ITmuxInfo | null>(null);

  useEffect(() => {
    if (!enabled || !sessionName) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/tmux/info?session=${encodeURIComponent(sessionName)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setInfo(data);
      } catch {
        // ignore
      }
    })();
    return () => controller.abort();
  }, [enabled, sessionName]);

  return info;
};

export default useTmuxInfo;
