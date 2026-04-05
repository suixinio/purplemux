import { useState, useEffect } from 'react';

interface IStartingPrompt {
  options: string[];
  isBypassPrompt: boolean;
}

const useStartingPrompt = (isStarting: boolean, sessionName: string): IStartingPrompt | null => {
  const [prompt, setPrompt] = useState<IStartingPrompt | null>(null);

  useEffect(() => {
    if (!isStarting) return;
    const timer = setTimeout(() => setPrompt({ options: [], isBypassPrompt: false }), 5000);
    return () => { clearTimeout(timer); setPrompt(null); };
  }, [isStarting]);

  useEffect(() => {
    if (!prompt) return;
    if (prompt.options.length > 0) return;
    let cancelled = false;
    const poll = () => {
      fetch(`/api/tmux/permission-options?session=${encodeURIComponent(sessionName)}`)
        .then((r) => r.json())
        .then(({ options, isBypassPrompt }) => {
          if (!cancelled && options?.length) {
            setPrompt({ options, isBypassPrompt: !!isBypassPrompt });
          }
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [prompt, sessionName]);

  return prompt;
};

export default useStartingPrompt;
