import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Spinner from '@/components/ui/spinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import useTimeline from '@/hooks/use-timeline';
import useSessionList from '@/hooks/use-session-list';
import useStartingPrompt from '@/hooks/use-starting-prompt';
import useTabStore, { selectSessionView, isCliIdle } from '@/hooks/use-tab-store';
import SessionListView from '@/components/features/terminal/session-list-view';
import SessionEmptyView from '@/components/features/terminal/session-empty-view';
import BypassPromptCard from '@/components/features/terminal/bypass-prompt-card';
import TimelineView from '@/components/features/timeline/timeline-view';
import SessionMetaBar from '@/components/features/terminal/session-meta-bar';

interface IClaudeCodePanelProps {
  tabId: string;
  sessionName: string;
  claudeSessionId?: string | null;
  cwd?: string;
  className?: string;
  onClose?: () => void;
  onNewSession?: () => void;
  scrollToBottomRef?: React.MutableRefObject<(() => void) | undefined>;
  addPendingMessageRef?: React.MutableRefObject<((text: string) => void) | undefined>;
}

const ClaudeCodePanel = ({
  tabId,
  sessionName,
  claudeSessionId,
  cwd,
  className,
  onClose,
  onNewSession,
  scrollToBottomRef,
  addPendingMessageRef,
}: IClaudeCodePanelProps) => {
  const t = useTranslations('terminal');
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(null);

  const claudeStatus = useTabStore((s) => s.tabs[tabId]?.claudeStatus ?? 'unknown');
  const isRestarting = useTabStore((s) => s.tabs[tabId]?.isRestarting ?? false);
  const isResuming = useTabStore((s) => s.tabs[tabId]?.isResuming ?? false);
  const storeTimelineLoading = useTabStore((s) => s.tabs[tabId]?.isTimelineLoading ?? true);
  const storeCliState = useTabStore((s) => s.tabs[tabId]?.cliState ?? 'inactive');
  const compactingSince = useTabStore((s) => s.tabs[tabId]?.compactingSince ?? null);
  const view = useTabStore((s) => selectSessionView(s.tabs, tabId));

  const handleResumeStarted = useCallback(
    () => {
      setResumingSessionId(null);
      useTabStore.getState().setResuming(tabId, true);
    },
    [tabId],
  );

  const handleResumeBlocked = useCallback(
    (payload: { reason: string; processName?: string }) => {
      setResumingSessionId(null);
      toast.warning(t('resumeBlocked'), {
        description: payload.processName
          ? t('resumeBlockedProcess', { name: payload.processName })
          : undefined,
      });
    },
    [t],
  );

  const handleResumeError = useCallback(() => {
    setResumingSessionId(null);
    toast.error(t('resumeFailed'));
  }, [t]);

  const {
    entries,
    tasks,
    sessionId,
    sessionSummary,
    initMeta,
    claudeStatus: claudeStatusFromTimeline,
    wsStatus,
    isLoading: isTimelineLoading,
    error: timelineError,
    loadMore: loadMoreTimeline,
    hasMore: timelineHasMore,
    retrySession,
    sendResume,
    addPendingUserMessage,
  } = useTimeline({
    sessionName,
    claudeSessionId,
    enabled: !!sessionName,
    resumeCallbacks: {
      onResumeStarted: handleResumeStarted,
      onResumeBlocked: handleResumeBlocked,
      onResumeError: handleResumeError,
    },
    onSync: (state) => {
      const current = useTabStore.getState().tabs[tabId];
      // 타임라인 로딩 중에는 스토어의 기존 상태를 보존 (탭 전환 시 깜빡임 방지)
      if (state.isLoading && current && current.claudeStatus !== 'unknown') {
        useTabStore.getState().setTimelineLoading(tabId, state.isLoading);
        return;
      }
      if (!(current?.claudeStatus === 'starting' && state.claudeStatus === 'not-running')) {
        const checkedAt = Math.max(Date.now(), (current?.claudeStatusCheckedAt ?? 0) + 1);
        useTabStore.getState().setClaudeStatus(tabId, state.claudeStatus, checkedAt);
      }
      useTabStore.getState().setTimelineLoading(tabId, state.isLoading);
    },
    getCliState: () => useTabStore.getState().tabs[tabId]?.cliState,
  });

  const {
    sessions,
    hasMore: sessionListHasMore,
    isLoading: isSessionListLoading,
    isLoadingMore: isSessionListLoadingMore,
    error: sessionListError,
    refetch: refetchSessions,
    loadMore: loadMoreSessions,
  } = useSessionList({
    tmuxSession: sessionName,
    enabled: !!sessionName && claudeStatus !== 'running' && claudeStatus !== 'starting',
    cwd,
  });

  useEffect(() => {
    if (!addPendingMessageRef) return;
    addPendingMessageRef.current = addPendingUserMessage;
    return () => {
      addPendingMessageRef.current = undefined;
    };
  }, [addPendingMessageRef, addPendingUserMessage]);

  const prevClaudeStatusRef = useRef(claudeStatus);
  useEffect(() => {
    const prev = prevClaudeStatusRef.current;
    prevClaudeStatusRef.current = claudeStatus;
    if (prev !== 'running' && claudeStatus === 'running' && claudeStatusFromTimeline !== 'running' && !isRestarting) {
      retrySession();
    }
  }, [claudeStatus, claudeStatusFromTimeline, retrySession, isRestarting]);

  const restartNeedsExitRef = useRef(false);
  const prevIsRestartingRef = useRef(isRestarting);

  useEffect(() => {
    if (isRestarting && !prevIsRestartingRef.current) {
      restartNeedsExitRef.current = claudeStatus === 'running' || claudeStatus === 'starting';
    }
    prevIsRestartingRef.current = isRestarting;

    if (!isRestarting) return;

    if (restartNeedsExitRef.current && claudeStatus !== 'running' && claudeStatus !== 'starting') {
      restartNeedsExitRef.current = false;
    }

    if (isCliIdle(storeCliState) && !restartNeedsExitRef.current && claudeStatus === 'running' && !storeTimelineLoading) {
      useTabStore.getState().setRestarting(tabId, false);
    }
  }, [isRestarting, claudeStatus, storeCliState, storeTimelineLoading, tabId]);

  const effectiveCliState = claudeStatus !== 'running' && claudeStatus !== 'starting' && storeCliState !== 'inactive'
    ? 'inactive' as const
    : storeCliState;

  useEffect(() => {
    if (storeCliState !== 'unknown') return;
    const controller = new AbortController();
    fetch('/api/tmux/recover-unknown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabId }),
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [tabId, storeCliState]);

  const startingPromptOptions = useStartingPrompt(claudeStatus === 'starting', sessionName);

  const handleSelectSession = useCallback(
    (sid: string) => {
      if (resumingSessionId) return;
      setResumingSessionId(sid);
      sendResume(sid, sessionName);
    },
    [resumingSessionId, sendResume, sessionName],
  );

  if (view === 'restarting') {
    return (
      <div className={cn('flex h-full w-full flex-col items-center justify-center', className)}>
        <Spinner className="h-4 w-4 text-muted-foreground" />
        <span className="mt-2 text-sm text-muted-foreground">{t('creatingConversation')}</span>
      </div>
    );
  }

  if (view === 'loading' || (view === 'inactive' && sessions.length === 0 && isSessionListLoading)) {
    return (
      <div className={cn('flex h-full w-full flex-col items-center justify-center animate-delayed-fade-in', className)}>
        <Spinner className="h-4 w-4 text-muted-foreground" />
        {isResuming && (
          <span className="mt-2 text-sm text-muted-foreground">{t('resumingSession')}</span>
        )}
        {!isResuming && startingPromptOptions && (
          startingPromptOptions.isBypassPrompt && startingPromptOptions.options.length > 0 ? (
            <BypassPromptCard
              sessionName={sessionName}
              options={startingPromptOptions.options}
              fallback={
                <button
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={onClose}
                >
                  {t('checkTerminal')}
                </button>
              }
            />
          ) : (
            <button
              className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={onClose}
            >
              {t('checkTerminal')}
            </button>
          )
        )}
      </div>
    );
  }

  if (view === 'inactive') {
    if (sessions.length === 0 && !sessionListError) {
      return (
        <div className={cn('h-full w-full', className)}>
          <SessionEmptyView onClose={onClose} onNewSession={onNewSession} />
        </div>
      );
    }
    return (
      <div className={cn('h-full w-full', className)}>
        <SessionListView
          sessions={sessions}
          isLoading={isSessionListLoading}
          isLoadingMore={isSessionListLoadingMore}
          hasMore={sessionListHasMore}
          error={sessionListError}
          resumingSessionId={resumingSessionId}
          onSelectSession={handleSelectSession}
          onRefresh={refetchSessions}
          onLoadMore={loadMoreSessions}
          onNewSession={onNewSession}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col', className)}>
      <SessionMetaBar entries={entries} sessionName={sessionName} sessionId={sessionId} sessionSummary={sessionSummary} initMeta={initMeta} />
      <div className="min-h-0 flex-1">
        <TimelineView
          entries={entries}
          tasks={tasks}
          sessionId={sessionId}
          sessionName={sessionName}
          tabId={tabId}
          initMeta={initMeta}
          cliState={effectiveCliState}
          compactingSince={compactingSince}
          claudeStatus={claudeStatusFromTimeline}
          wsStatus={wsStatus}
          isLoading={isTimelineLoading}
          error={timelineError}
          onRetry={retrySession}
          onLoadMore={loadMoreTimeline}
          hasMore={timelineHasMore}
          scrollToBottomRef={scrollToBottomRef}
        />
      </div>
    </div>
  );
};

export default ClaudeCodePanel;
