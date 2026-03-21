import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import { cn } from '@/lib/utils';
import useTimeline from '@/hooks/use-timeline';
import useSessionList from '@/hooks/use-session-list';
import useSessionView from '@/hooks/use-session-view';
import useSessionMeta from '@/hooks/use-session-meta';
import useGitBranch from '@/hooks/use-git-branch';
import SessionListView from '@/components/features/terminal/session-list-view';
import SessionEmptyView from '@/components/features/terminal/session-empty-view';
import SessionNavBar from '@/components/features/terminal/session-nav-bar';
import TimelineView from '@/components/features/timeline/timeline-view';
import TerminalContainer from '@/components/features/terminal/terminal-container';
import WebInputBar from '@/components/features/terminal/web-input-bar';
import MobileMetaSheet from './mobile-meta-sheet';
import type { TCliState } from '@/types/timeline';

dayjs.extend(relativeTime);
dayjs.locale('ko');

type TClaudeActiveTab = 'timeline' | 'terminal';

interface IMobileClaudeCodePanelProps {
  sessionName: string;
  claudeSessionId?: string | null;
  claudeActiveTab: TClaudeActiveTab;
  terminalRef: React.RefObject<HTMLDivElement | null>;
  terminalReady: boolean;
  sendStdin: (data: string) => void;
  terminalWsConnected: boolean;
  focusTerminal: () => void;
  focusInputRef: React.MutableRefObject<(() => void) | undefined>;
  processHintRef: React.MutableRefObject<((isClaudeRunning: boolean) => void) | undefined>;
  onCliStateChange: (state: TCliState) => void;
  onInputVisibleChange: (visible: boolean) => void;
}

const RELATIVE_TIME_INTERVAL_MS = 60_000;

const MobileClaudeCodePanel = ({
  sessionName,
  claudeSessionId,
  claudeActiveTab,
  terminalRef,
  terminalReady,
  sendStdin,
  terminalWsConnected,
  focusTerminal,
  focusInputRef,
  processHintRef,
  onCliStateChange,
  onInputVisibleChange,
}: IMobileClaudeCodePanelProps) => {
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(null);
  const [metaSheetOpen, setMetaSheetOpen] = useState(false);
  const navigateToTimelineRef = useRef<() => void>(() => {});
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), RELATIVE_TIME_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const handleResumeStarted = useCallback(() => {
    setResumingSessionId(null);
    navigateToTimelineRef.current();
  }, []);

  const handleResumeBlocked = useCallback(
    (payload: { reason: string; processName?: string }) => {
      setResumingSessionId(null);
      toast.warning('터미널에서 다른 프로세스가 실행 중입니다', {
        description: payload.processName
          ? `현재 실행 중인 프로세스: ${payload.processName}`
          : undefined,
      });
    },
    [],
  );

  const handleResumeError = useCallback(() => {
    setResumingSessionId(null);
    toast.error('세션을 재개할 수 없습니다');
  }, []);

  const {
    entries,
    cliState,
    sessionId,
    sessionSummary,
    sessionStatus,
    wsStatus,
    isAutoScrollEnabled,
    setAutoScrollEnabled,
    isLoading: isTimelineLoading,
    isSessionTransitioning,
    error: timelineError,
    loadMore: loadMoreTimeline,
    hasMore: timelineHasMore,
    retrySession,
    sendResume,
    sendProcessHint,
  } = useTimeline({
    sessionName,
    claudeSessionId,
    enabled: !!sessionName,
    resumeCallbacks: {
      onResumeStarted: handleResumeStarted,
      onResumeBlocked: handleResumeBlocked,
      onResumeError: handleResumeError,
    },
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
    enabled: !!sessionName && sessionStatus !== 'active',
  });

  const { view, navigateToList, navigateToTimeline } = useSessionView(
    sessionStatus,
    sessions,
    isSessionListLoading,
    sessionListError,
    claudeSessionId,
    isTimelineLoading,
  );

  const { meta } = useSessionMeta(entries, sessionSummary);
  const { branch, isLoading: isBranchLoading } = useGitBranch(sessionName);

  useEffect(() => {
    navigateToTimelineRef.current = navigateToTimeline;
  });

  useEffect(() => {
    if (processHintRef) {
      processHintRef.current = sendProcessHint;
      return () => {
        processHintRef.current = undefined;
      };
    }
  }, [processHintRef, sendProcessHint]);

  const isInputVisible = view === 'timeline';

  useEffect(() => {
    onCliStateChange(cliState);
  }, [cliState, onCliStateChange]);

  useEffect(() => {
    onInputVisibleChange(isInputVisible);
  }, [isInputVisible, onInputVisibleChange]);

  const handleSelectSession = useCallback(
    (sid: string) => {
      if (resumingSessionId) return;
      setResumingSessionId(sid);
      sendResume(sid, sessionName);
    },
    [resumingSessionId, sendResume, sessionName],
  );

  if (view === 'empty') {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-muted">
        <SessionEmptyView />
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-muted">
        <SessionListView
          sessions={sessions}
          isLoading={isSessionListLoading}
          isLoadingMore={isSessionListLoadingMore}
          hasMore={sessionListHasMore}
          error={sessionListError}
          highlightedSessionId={claudeSessionId ?? null}
          resumingSessionId={resumingSessionId}
          onSelectSession={handleSelectSession}
          onRefresh={refetchSessions}
          onLoadMore={loadMoreSessions}
        />
      </div>
    );
  }

  const relativeTimeStr = meta.updatedAt ? dayjs(meta.updatedAt).fromNow() : '-';

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted">
      <SessionNavBar onNavigateToList={navigateToList} />

      {claudeActiveTab === 'timeline' && (
        <div
          className="flex shrink-0 cursor-pointer items-center border-b px-4 py-1.5 hover:bg-muted/30"
          role="button"
          tabIndex={0}
          onClick={() => setMetaSheetOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setMetaSheetOpen(true);
            }
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
            <span className="truncate text-sm font-medium text-foreground">{meta.title}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="shrink-0 text-muted-foreground">{relativeTimeStr}</span>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-100',
            claudeActiveTab === 'timeline' ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <TimelineView
            entries={entries}
            sessionId={sessionId}
            sessionStatus={sessionStatus}
            wsStatus={wsStatus}
            isLoading={isTimelineLoading}
            isSessionTransitioning={isSessionTransitioning}
            error={timelineError}
            isAutoScrollEnabled={isAutoScrollEnabled}
            onAutoScrollChange={setAutoScrollEnabled}
            onRetry={retrySession}
            onLoadMore={loadMoreTimeline}
            hasMore={timelineHasMore}
          />
        </div>
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-100',
            claudeActiveTab === 'terminal'
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
            !terminalReady && claudeActiveTab === 'terminal' && 'opacity-0',
          )}
        >
          <TerminalContainer
            ref={terminalRef}
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="shrink-0">
        <WebInputBar
          cliState={cliState}
          sendStdin={sendStdin}
          terminalWsConnected={terminalWsConnected}
          visible={isInputVisible}
          focusTerminal={focusTerminal}
          focusInputRef={focusInputRef}
          maxRows={3}
        />
      </div>

      <MobileMetaSheet
        open={metaSheetOpen}
        onOpenChange={setMetaSheetOpen}
        title={meta.title}
        createdAt={meta.createdAt}
        updatedAt={meta.updatedAt}
        userCount={meta.userCount}
        assistantCount={meta.assistantCount}
        inputTokens={meta.inputTokens}
        outputTokens={meta.outputTokens}
        totalTokens={meta.totalTokens}
        totalCost={meta.totalCost}
        tokensByModel={meta.tokensByModel}
        branch={branch}
        isBranchLoading={isBranchLoading}
      />
    </div>
  );
};

export default MobileClaudeCodePanel;
