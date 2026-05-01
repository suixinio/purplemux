import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import Spinner from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import OpenAIIcon from '@/components/icons/openai-icon';
import useTabStore, { selectSessionView } from '@/hooks/use-tab-store';
import useTimeline from '@/hooks/use-timeline';
import CodexBootProgress from '@/components/features/workspace/codex-boot-progress';
import CodexStatusDot from '@/components/features/workspace/codex-status-dot';
import CodexUpdatePromptCard from '@/components/features/workspace/codex-update-prompt-card';
import PermissionPromptCard from '@/components/features/timeline/permission-prompt-card';
import TimelineView from '@/components/features/timeline/timeline-view';
import type { ICodexUpdatePromptInfo, TCodexUpdateAnswer } from '@/lib/codex-update-prompt-detector';

interface IMobileCodexPanelProps {
  tabId?: string;
  sessionName?: string;
  onNewSession?: () => void;
  onRestart?: () => void;
  updatePrompt?: ICodexUpdatePromptInfo | null;
  onUpdatePromptResponse?: (answer: TCodexUpdateAnswer) => void;
}

const MobileCodexPanel = ({
  tabId,
  sessionName,
  onNewSession,
  onRestart,
  updatePrompt,
  onUpdatePromptResponse,
}: IMobileCodexPanelProps) => {
  const t = useTranslations('terminal');
  const agentProcess = useTabStore((s) => (tabId ? s.tabs[tabId]?.agentProcess ?? null : null));
  const agentInstalled = useTabStore((s) => (tabId ? s.tabs[tabId]?.agentInstalled ?? true : true));
  const cliState = useTabStore((s) => (tabId ? s.tabs[tabId]?.cliState ?? 'inactive' : 'inactive'));
  const compactingSince = useTabStore((s) => (tabId ? s.tabs[tabId]?.compactingSince ?? null : null));
  const codexSessionId = useTabStore((s) => (tabId ? s.tabs[tabId]?.agentSessionId ?? null : null));
  const view = useTabStore((s) => (tabId ? selectSessionView(s.tabs, tabId) : 'session-list' as const));

  const handleStart = useCallback(() => onNewSession?.(), [onNewSession]);

  const {
    entries,
    tasks,
    sessionId,
    initMeta,
    sessionStats,
    wsStatus,
    isLoading: isTimelineLoading,
    error: timelineError,
    loadMore: loadMoreTimeline,
    hasMore: timelineHasMore,
    retrySession,
  } = useTimeline({
    sessionName: sessionName ?? '',
    claudeSessionId: codexSessionId,
    panelType: 'codex-cli',
    enabled: !!sessionName,
    getCliState: tabId ? () => useTabStore.getState().tabs[tabId]?.cliState : undefined,
  });

  if (!agentInstalled) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-muted px-6 text-center text-muted-foreground"
        role="status"
      >
        <OpenAIIcon size={32} className="text-muted-foreground/60" />
        <span className="text-sm font-medium text-foreground">{t('codexNotInstalled')}</span>
      </div>
    );
  }

  if (view === 'check') {
    return (
      <div className="animate-delayed-fade-in flex min-h-0 flex-1 flex-col items-center justify-center bg-muted px-4">
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
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-muted px-6 text-center" role="status">
        <OpenAIIcon size={32} className="text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">{t('codexInactiveMessage')}</p>
        {onNewSession && (
          <Button size="default" className="min-h-11" onClick={handleStart}>
            <Plus className="size-4" />
            {t('codexStartSession')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/40 px-3">
        <OpenAIIcon size={16} className="text-foreground" aria-label="Codex" />
        <span className="text-sm font-medium text-foreground">Codex</span>
        <CodexStatusDot cliState={cliState} className="ml-auto" />
      </div>
      {cliState === 'needs-input' && tabId && sessionName && (
        <div className="shrink-0 border-b border-border/40 p-3">
          <PermissionPromptCard tabId={tabId} sessionName={sessionName} />
        </div>
      )}
      <div className="min-h-0 flex-1">
        {cliState === 'busy' && entries.length === 0 && !isTimelineLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Spinner className="h-4 w-4" />
            <p className="text-xs">{t('codexTimelinePlaceholder')}</p>
          </div>
        ) : (
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
          />
        )}
      </div>
    </div>
  );
};

export default MobileCodexPanel;
