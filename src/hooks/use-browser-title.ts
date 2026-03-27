import { useEffect } from 'react';
import useTabStore, { selectGlobalStatus } from '@/hooks/use-tab-store';

const useBrowserTitle = (baseTitle: string) => {
  const attentionCount = useTabStore((s) => selectGlobalStatus(s.tabs).attentionCount);

  useEffect(() => {
    try {
      document.title = attentionCount > 0
        ? `(${attentionCount}) ${baseTitle}`
        : baseTitle;
    } catch {
      // non-critical
    }
  }, [attentionCount, baseTitle]);
};

export default useBrowserTitle;
