import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import Spinner from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import OpenAIIcon from '@/components/icons/openai-icon';
import useTabStore, { selectSessionView } from '@/hooks/use-tab-store';
import CodexBootProgress from '@/components/features/workspace/codex-boot-progress';
import CodexStatusDot from '@/components/features/workspace/codex-status-dot';

interface IMobileCodexPanelProps {
  tabId?: string;
  onNewSession?: () => void;
  onRestart?: () => void;
}

const MobileCodexPanel = ({ tabId, onNewSession, onRestart }: IMobileCodexPanelProps) => {
  const t = useTranslations('terminal');
  const agentProcess = useTabStore((s) => (tabId ? s.tabs[tabId]?.agentProcess ?? null : null));
  const agentInstalled = useTabStore((s) => (tabId ? s.tabs[tabId]?.agentInstalled ?? true : true));
  const cliState = useTabStore((s) => (tabId ? s.tabs[tabId]?.cliState ?? 'inactive' : 'inactive'));
  const view = useTabStore((s) => (tabId ? selectSessionView(s.tabs, tabId) : 'session-list' as const));

  const handleStart = useCallback(() => onNewSession?.(), [onNewSession]);

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
      <div className="animate-delayed-fade-in flex min-h-0 flex-1 flex-col items-center justify-center bg-muted">
        <CodexBootProgress onRestart={onRestart} />
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
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
        {cliState === 'busy' ? (
          <Spinner className="h-4 w-4 text-muted-foreground" />
        ) : (
          <OpenAIIcon size={28} className="text-muted-foreground/60" />
        )}
        <p className="text-sm">{t('codexTimelinePlaceholder')}</p>
      </div>
    </div>
  );
};

export default MobileCodexPanel;
