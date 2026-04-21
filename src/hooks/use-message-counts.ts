import { useEffect, useState } from 'react';

export interface IMessageCounts {
  userCount: number;
  assistantCount: number;
  toolCount: number;
  toolBreakdown: Record<string, number>;
}

const useMessageCounts = (
  jsonlPath: string | null,
  enabled: boolean,
): IMessageCounts | null => {
  const [counts, setCounts] = useState<IMessageCounts | null>(null);

  useEffect(() => {
    if (!enabled || !jsonlPath) return;

    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/timeline/message-counts?jsonlPath=${encodeURIComponent(jsonlPath)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: IMessageCounts | null) => {
        if (!cancelled && data) setCounts(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [jsonlPath, enabled]);

  return counts;
};

export default useMessageCounts;
