import { useState, useCallback } from 'react';
import type { ISessionMeta, TSessionStatus } from '@/types/timeline';

export type TSessionView = 'list' | 'empty' | 'timeline';

interface IUseSessionViewReturn {
  view: TSessionView;
  navigateToList: () => void;
  navigateToTimeline: () => void;
}

const useSessionView = (
  sessionStatus: TSessionStatus,
  sessions: ISessionMeta[],
  isSessionListLoading: boolean,
  error?: string | null,
): IUseSessionViewReturn => {
  const [manualView, setManualView] = useState<TSessionView | null>(null);

  const view: TSessionView = (() => {
    if (sessionStatus === 'active') return 'timeline';
    if (manualView === 'timeline') return 'timeline';
    if (manualView === 'list') return 'list';
    if (isSessionListLoading) return 'list';
    if (error) return 'list';
    if (sessions.length > 0) return 'list';
    return 'empty';
  })();

  const navigateToList = useCallback(() => {
    setManualView('list');
  }, []);

  const navigateToTimeline = useCallback(() => {
    setManualView('timeline');
  }, []);

  return { view, navigateToList, navigateToTimeline };
};

export default useSessionView;
