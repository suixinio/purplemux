import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';

interface IQuickPrompt {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
}

interface IQuickPromptsData {
  builtins: IQuickPrompt[];
  custom: IQuickPrompt[];
}

interface IUseQuickPromptsReturn {
  prompts: IQuickPrompt[];
  builtinPrompts: IQuickPrompt[];
  customPrompts: IQuickPrompt[];
  isLoading: boolean;
  toggleBuiltin: (id: string, enabled: boolean) => Promise<void>;
  saveCustom: (prompts: IQuickPrompt[]) => Promise<void>;
  resetAll: () => Promise<void>;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('fetch failed');
    return res.json() as Promise<IQuickPromptsData>;
  });

const EMPTY: IQuickPromptsData = { builtins: [], custom: [] };

const useQuickPrompts = (): IUseQuickPromptsReturn => {
  const { data, isLoading, mutate } = useSWR('/api/quick-prompts', fetcher, {
    revalidateOnFocus: false,
  });

  const safeData = data ?? EMPTY;

  const prompts = useMemo(
    () => [...safeData.builtins, ...safeData.custom].filter((p) => p.enabled),
    [safeData],
  );

  const persist = useCallback(async (builtins: IQuickPrompt[], custom: IQuickPrompt[]) => {
    const disabledBuiltinIds = builtins.filter((b) => !b.enabled).map((b) => b.id);
    const res = await fetch('/api/quick-prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom, disabledBuiltinIds }),
    });
    if (!res.ok) throw new Error('save failed');
  }, []);

  const toggleBuiltin = useCallback(
    async (id: string, enabled: boolean) => {
      const update = (prev: IQuickPromptsData) => ({
        ...prev,
        builtins: prev.builtins.map((b) => (b.id === id ? { ...b, enabled } : b)),
      });
      await mutate(
        async (current) => {
          const prev = current ?? EMPTY;
          const next = update(prev);
          await persist(next.builtins, next.custom);
          return next;
        },
        { optimisticData: (current) => update(current ?? EMPTY), rollbackOnError: true, revalidate: false },
      ).catch(() => toast.error('설정을 저장할 수 없습니다'));
    },
    [mutate, persist],
  );

  const saveCustom = useCallback(
    async (custom: IQuickPrompt[]) => {
      const update = (prev: IQuickPromptsData) => ({ ...prev, custom });
      await mutate(
        async (current) => {
          const prev = current ?? EMPTY;
          const next = update(prev);
          await persist(next.builtins, next.custom);
          return next;
        },
        { optimisticData: (current) => update(current ?? EMPTY), rollbackOnError: true, revalidate: false },
      ).catch(() => toast.error('설정을 저장할 수 없습니다'));
    },
    [mutate, persist],
  );

  const resetAll = useCallback(async () => {
    const update = (prev: IQuickPromptsData) => ({
      builtins: prev.builtins.map((b) => ({ ...b, enabled: true })),
      custom: [],
    });
    await mutate(
      async (current) => {
        const prev = current ?? EMPTY;
        const next = update(prev);
        await persist(next.builtins, next.custom);
        return next;
      },
      { optimisticData: (current) => update(current ?? EMPTY), rollbackOnError: true, revalidate: false },
    ).catch(() => toast.error('설정을 저장할 수 없습니다'));
  }, [mutate, persist]);

  return {
    prompts,
    builtinPrompts: safeData.builtins,
    customPrompts: safeData.custom,
    isLoading,
    toggleBuiltin,
    saveCustom,
    resetAll,
  };
};

export default useQuickPrompts;
export type { IQuickPrompt };
