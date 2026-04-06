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
  order: string[];
}

interface IUseQuickPromptsReturn {
  prompts: IQuickPrompt[];
  allOrderedPrompts: IQuickPrompt[];
  builtinPrompts: IQuickPrompt[];
  customPrompts: IQuickPrompt[];
  order: string[];
  isLoading: boolean;
  toggleBuiltin: (id: string, enabled: boolean) => Promise<void>;
  saveCustom: (prompts: IQuickPrompt[]) => Promise<void>;
  saveOrder: (order: string[]) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  resetAll: () => Promise<void>;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('fetch failed');
    return res.json() as Promise<IQuickPromptsData>;
  });

const EMPTY: IQuickPromptsData = { builtins: [], custom: [], order: [] };

const applyOrder = <T extends { id: string }>(items: T[], order: string[]): T[] => {
  if (order.length === 0) return items;
  const map = new Map(items.map((i) => [i.id, i]));
  const ordered: T[] = [];
  for (const id of order) {
    const item = map.get(id);
    if (item) {
      ordered.push(item);
      map.delete(id);
    }
  }
  for (const item of map.values()) {
    ordered.push(item);
  }
  return ordered;
};

const useQuickPrompts = (): IUseQuickPromptsReturn => {
  const { data, isLoading, mutate } = useSWR('/api/quick-prompts', fetcher, {
    revalidateOnFocus: false,
  });

  const safeData = data ?? EMPTY;

  const prompts = useMemo(
    () => applyOrder([...safeData.builtins, ...safeData.custom].filter((p) => p.enabled), safeData.order),
    [safeData],
  );

  const allOrderedPrompts = useMemo(
    () => applyOrder([...safeData.builtins, ...safeData.custom], safeData.order),
    [safeData],
  );

  const persist = useCallback(async (builtins: IQuickPrompt[], custom: IQuickPrompt[], order: string[]) => {
    const disabledBuiltinIds = builtins.filter((b) => !b.enabled).map((b) => b.id);
    const res = await fetch('/api/quick-prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom, disabledBuiltinIds, order }),
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
          await persist(next.builtins, next.custom, next.order);
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
          await persist(next.builtins, next.custom, next.order);
          return next;
        },
        { optimisticData: (current) => update(current ?? EMPTY), rollbackOnError: true, revalidate: false },
      ).catch(() => toast.error('설정을 저장할 수 없습니다'));
    },
    [mutate, persist],
  );

  const saveOrder = useCallback(
    async (order: string[]) => {
      const update = (prev: IQuickPromptsData) => ({ ...prev, order });
      await mutate(
        async (current) => {
          const prev = current ?? EMPTY;
          const next = update(prev);
          await persist(next.builtins, next.custom, next.order);
          return next;
        },
        { optimisticData: (current) => update(current ?? EMPTY), rollbackOnError: true, revalidate: false },
      ).catch(() => toast.error('설정을 저장할 수 없습니다'));
    },
    [mutate, persist],
  );

  const deletePrompt = useCallback(
    async (id: string) => {
      const update = (prev: IQuickPromptsData) => ({
        ...prev,
        custom: prev.custom.filter((p) => p.id !== id),
        order: prev.order.filter((oid) => oid !== id),
      });
      await mutate(
        async (current) => {
          const prev = current ?? EMPTY;
          const next = update(prev);
          await persist(next.builtins, next.custom, next.order);
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
      order: [],
    });
    await mutate(
      async (current) => {
        const prev = current ?? EMPTY;
        const next = update(prev);
        await persist(next.builtins, next.custom, next.order);
        return next;
      },
      { optimisticData: (current) => update(current ?? EMPTY), rollbackOnError: true, revalidate: false },
    ).catch(() => toast.error('설정을 저장할 수 없습니다'));
  }, [mutate, persist]);

  return {
    prompts,
    allOrderedPrompts,
    builtinPrompts: safeData.builtins,
    customPrompts: safeData.custom,
    order: safeData.order,
    isLoading,
    toggleBuiltin,
    saveCustom,
    saveOrder,
    deletePrompt,
    resetAll,
  };
};

export default useQuickPrompts;
export type { IQuickPrompt };
