import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

interface IQuickPrompt {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
}

interface IUseQuickPromptsReturn {
  prompts: IQuickPrompt[];
  allPrompts: IQuickPrompt[];
  isLoading: boolean;
  save: (prompts: IQuickPrompt[]) => Promise<void>;
}

const useQuickPrompts = (): IUseQuickPromptsReturn => {
  const [allPrompts, setAllPrompts] = useState<IQuickPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchPrompts = async () => {
      try {
        const res = await fetch('/api/quick-prompts');
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (!cancelled) setAllPrompts(data);
      } catch {
        // fallback handled by server
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchPrompts();
    return () => {
      cancelled = true;
    };
  }, []);

  const prompts = useMemo(
    () => allPrompts.filter((p) => p.enabled),
    [allPrompts],
  );

  const save = useCallback(async (next: IQuickPrompt[]) => {
    setAllPrompts(next);
    try {
      const res = await fetch('/api/quick-prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error('save failed');
    } catch {
      toast.error('설정을 저장할 수 없습니다');
    }
  }, []);

  return { prompts, allPrompts, isLoading, save };
};

export default useQuickPrompts;
export type { IQuickPrompt };
