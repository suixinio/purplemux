import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import OpenAIIcon from '@/components/icons/openai-icon';
import useTabStore, { selectSessionView } from '@/hooks/use-tab-store';
import useTimeline from '@/hooks/use-timeline';
import { useSessionMetaCompute } from '@/hooks/use-session-meta';
import CodexBootProgress from '@/components/features/workspace/codex-boot-progress';
import CodexUpdatePromptCard from '@/components/features/workspace/codex-update-prompt-card';
import TimelineView from '@/components/features/timeline/timeline-view';
import SessionMetaBar, { SessionMetaBarSkeleton } from '@/components/features/workspace/session-meta-bar';
import type { ICodexUpdatePromptInfo, TCodexUpdateAnswer } from '@/lib/codex-update-prompt-detector';

interface ICodexPanelProps {
  tabId: string;
  sessionName: string;
  className?: string;
  onClose?: () => void;
  onNewSession?: () => void;
  onRestart?: () => void;
  updatePrompt?: ICodexUpdatePromptInfo | null;
  onUpdatePromptResponse?: (answer: TCodexUpdateAnswer) => void;
  scrollToBottomRef?: React.MutableRefObject<(() => void) | undefined>;
  addPendingMessageRef?: React.MutableRefObject<((text: string, options?: { autoHide?: boolean; attachmentPlaceholder?: boolean }) => string) | undefined>;
  removePendingMessageRef?: React.MutableRefObject<((id: string) => void) | undefined>;
}

const CodexPanel = ({
  tabId,
  sessionName,
  className,
  onClose: _onClose,
  onNewSession,
  onRestart,
  updatePrompt,
  onUpdatePromptResponse,
  scrollToBottomRef,
  addPendingMessageRef,
  removePendingMessageRef,
}: ICodexPanelProps) => {
  const t = useTranslations('terminal');
  const agentProcess = useTabStore((s) => s.tabs[tabId]?.agentProcess ?? null);
  const agentInstalled = useTabStore((s) => s.tabs[tabId]?.agentInstalled ?? true);
  const cliState = useTabStore((s) => s.tabs[tabId]?.cliState ?? 'inactive');
  const compactingSince = useTabStore((s) => s.tabs[tabId]?.compactingSince ?? null);
  const view = useTabStore((s) => selectSessionView(s.tabs, tabId));
  const codexSessionId = useTabStore((s) => s.tabs[tabId]?.agentSessionId ?? null);
  const cachedSessionMeta = useTabStore((s) => s.tabs[tabId]?.sessionMetaCache ?? null);
  const tabAgentSummary = useTabStore((s) => s.tabs[tabId]?.agentSummary ?? null);
  const tabLastUserMessage = useTabStore((s) => s.tabs[tabId]?.lastUserMessage ?? null);

  const handleStart = useCallback(() => {
    onNewSession?.();
  }, [onNewSession]);

  const {
    entries,
    tasks,
    sessionId,
    jsonlPath,
    sessionSummary,
    initMeta,
    sessionStats,
    agentProcess: agentProcessFromTimeline,
    wsStatus,
    isLoading: isTimelineLoading,
    error: timelineError,
    loadMore: loadMoreTimeline,
    hasMore: timelineHasMore,
    retrySession,
    addPendingUserMessage,
    removePendingUserMessage,
  } = useTimeline({
    sessionName,
    claudeSessionId: codexSessionId,
    panelType: 'codex-cli',
    enabled: !!sessionName,
    onSync: (state) => {
      const checkedAt = Date.now();
      if (state.agentProcess !== null) {
        useTabStore.getState().setAgentProcess(tabId, state.agentProcess, checkedAt);
      }
      if (!state.agentInstalled) {
        useTabStore.getState().setAgentInstalled(tabId, false);
      }
      useTabStore.getState().setTimelineLoading(tabId, state.isLoading);
    },
    getCliState: () => useTabStore.getState().tabs[tabId]?.cliState,
  });

  useEffect(() => {
    if (addPendingMessageRef) addPendingMessageRef.current = addPendingUserMessage;
    if (removePendingMessageRef) removePendingMessageRef.current = removePendingUserMessage;
    return () => {
      if (addPendingMessageRef) addPendingMessageRef.current = undefined;
      if (removePendingMessageRef) removePendingMessageRef.current = undefined;
    };
  }, [addPendingMessageRef, removePendingMessageRef, addPendingUserMessage, removePendingUserMessage]);

  const prevAgentProcessRef = useRef(agentProcess);
  useEffect(() => {
    const prev = prevAgentProcessRef.current;
    prevAgentProcessRef.current = agentProcess;
    if (prev !== true && agentProcess === true && agentProcessFromTimeline !== true) {
      retrySession();
    }
  }, [agentProcess, agentProcessFromTimeline, retrySession]);

  useEffect(() => {
    if (cliState !== 'unknown') return;
    const controller = new AbortController();
    fetch('/api/tmux/recover-unknown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabId }),
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [tabId, cliState]);

  const isHeaderLoading = agentProcess === null || (entries.length === 0 && isTimelineLoading);
  const freshMeta = useSessionMetaCompute(entries, sessionSummary, initMeta, sessionStats, tabAgentSummary, tabLastUserMessage);

  useEffect(() => {
    if (!isHeaderLoading) {
      useTabStore.getState().setSessionMetaCache(tabId, { meta: freshMeta, sessionId, jsonlPath });
    }
  }, [isHeaderLoading, freshMeta, sessionId, jsonlPath, tabId]);

  if (!agentInstalled) {
    return (
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground',
          className,
        )}
        role="status"
      >
        <OpenAIIcon size={32} className="text-muted-foreground/60" />
        <span className="text-sm font-medium text-foreground">{t('codexNotInstalled')}</span>
      </div>
    );
  }

  if (view === 'check') {
    return (
      <div
        className={cn(
          'animate-delayed-fade-in flex h-full w-full flex-col items-center justify-center gap-3 px-6',
          className,
        )}
      >
        {updatePrompt && onUpdatePromptResponse ? (
          <CodexUpdatePromptCard prompt={updatePrompt} onRespond={onUpdatePromptResponse} />
        ) : (
          <CodexBootProgress onRestart={onRestart} />
        )}
      </div>
    );
  }

  if (cliState === 'inactive' && agentProcess !== true) {
    return (
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center',
          className,
        )}
        role="status"
      >
        <OpenAIIcon size={32} className="text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">{t('codexInactiveMessage')}</p>
        {onNewSession && (
          <Button size="sm" onClick={handleStart}>
            <Plus className="size-3.5" />
            {t('codexStartSession')}
          </Button>
        )}
      </div>
    );
  }

  const displayMeta = isHeaderLoading
    ? cachedSessionMeta
    : { meta: freshMeta, sessionId, jsonlPath };

  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col', className)}>
      {displayMeta ? (
        <SessionMetaBar
          meta={displayMeta.meta}
          sessionName={sessionName}
          sessionId={displayMeta.sessionId}
          jsonlPath={displayMeta.jsonlPath}
        />
      ) : (
        <SessionMetaBarSkeleton />
      )}
      <div className="min-h-0 flex-1">
        <TimelineView
          entries={entries}
          tasks={tasks}
          sessionId={sessionId}
          sessionName={sessionName}
          tabId={tabId}
          initMeta={initMeta}
          sessionStats={sessionStats}
          cliState={cliState}
          compactingSince={compactingSince}
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

export default CodexPanel;
