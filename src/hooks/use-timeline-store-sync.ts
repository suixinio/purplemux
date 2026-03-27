import { useEffect, useRef } from 'react';
import useTabStore from '@/hooks/use-tab-store';
import type { TCliState, TSessionStatus, TTimelineConnectionStatus } from '@/types/timeline';

interface ITimelineStoreSyncOptions {
  tabId: string | undefined;
  sessionStatus: TSessionStatus;
  cliState: TCliState;
  isTimelineLoading: boolean;
  wsStatus: TTimelineConnectionStatus;
  sessionsCount: number;
  isClaudeRunning: boolean;
  retrySession: () => void;
}

const useTimelineStoreSync = ({
  tabId,
  sessionStatus,
  cliState,
  isTimelineLoading,
  wsStatus,
  sessionsCount,
  isClaudeRunning,
  retrySession,
}: ITimelineStoreSyncOptions) => {
  useEffect(() => {
    if (!tabId) return;
    useTabStore.getState().setSessionStatus(tabId, sessionStatus);
  }, [tabId, sessionStatus]);

  useEffect(() => {
    if (!tabId) return;
    useTabStore.getState().setCliState(tabId, cliState);
  }, [tabId, cliState]);

  useEffect(() => {
    if (!tabId) return;
    useTabStore.getState().setTimelineLoading(tabId, isTimelineLoading);
  }, [tabId, isTimelineLoading]);

  useEffect(() => {
    if (!tabId) return;
    useTabStore.getState().setTimelineWsStatus(tabId, wsStatus);
  }, [tabId, wsStatus]);

  useEffect(() => {
    if (!tabId) return;
    useTabStore.getState().setHasSessions(tabId, sessionsCount > 0);
  }, [tabId, sessionsCount]);

  // Claude 프로세스 시작 시 타임라인 재연결
  const prevClaudeRunningRef = useRef(isClaudeRunning);

  useEffect(() => {
    const wasRunning = prevClaudeRunningRef.current;
    prevClaudeRunningRef.current = isClaudeRunning;

    if (!wasRunning && isClaudeRunning && sessionStatus !== 'active') {
      retrySession();
    }
  }, [isClaudeRunning, sessionStatus, retrySession]);
};

export default useTimelineStoreSync;
