import { useState, useCallback, useEffect, useRef } from 'react';
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
  claudeSessionId?: string | null,
  isTimelineLoading?: boolean,
): IUseSessionViewReturn => {
  const [manualView, setManualView] = useState<TSessionView | null>(null);
  const prevStatusRef = useRef(sessionStatus);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = sessionStatus;

    if (prev === 'active' && sessionStatus !== 'active' && manualView === 'timeline') {
      setManualView(null);
    }
  }, [sessionStatus, manualView]);

  const view: TSessionView = (() => {
    if (sessionStatus === 'active') return 'timeline';
    if (manualView === 'list') return 'list';
    if (claudeSessionId && isTimelineLoading) return 'timeline';
    if (manualView === 'timeline') return 'timeline';
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
