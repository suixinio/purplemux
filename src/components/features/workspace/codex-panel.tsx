import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import Spinner from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import OpenAIIcon from '@/components/icons/openai-icon';
import useTabStore, { selectSessionView } from '@/hooks/use-tab-store';
import CodexBootProgress from '@/components/features/workspace/codex-boot-progress';
import CodexStatusDot from '@/components/features/workspace/codex-status-dot';
import PermissionPromptCard from '@/components/features/timeline/permission-prompt-card';

interface ICodexPanelProps {
  tabId: string;
  sessionName: string;
  className?: string;
  onClose?: () => void;
  onNewSession?: () => void;
  onRestart?: () => void;
}

const CodexPanel = ({
  tabId,
  sessionName,
  className,
  onClose: _onClose,
  onNewSession,
  onRestart,
}: ICodexPanelProps) => {
  const t = useTranslations('terminal');
  const agentProcess = useTabStore((s) => s.tabs[tabId]?.agentProcess ?? null);
  const agentInstalled = useTabStore((s) => s.tabs[tabId]?.agentInstalled ?? true);
  const cliState = useTabStore((s) => s.tabs[tabId]?.cliState ?? 'inactive');
  const view = useTabStore((s) => selectSessionView(s.tabs, tabId));

  const handleStart = useCallback(() => {
    onNewSession?.();
  }, [onNewSession]);

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
          'animate-delayed-fade-in flex h-full w-full flex-col items-center justify-center gap-3',
          className,
        )}
      >
        <CodexBootProgress onRestart={onRestart} />
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

  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col bg-card', className)}>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/40 px-3">
        <OpenAIIcon size={16} className="text-foreground" aria-label="Codex" />
        <span className="text-sm font-medium text-foreground">Codex</span>
        <CodexStatusDot cliState={cliState} className="ml-auto" />
      </div>
      {cliState === 'needs-input' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <PermissionPromptCard tabId={tabId} sessionName={sessionName} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
          {cliState === 'busy' ? (
            <Spinner className="h-4 w-4 text-muted-foreground" />
          ) : (
            <OpenAIIcon size={28} className="text-muted-foreground/60" />
          )}
          <p className="text-sm">{t('codexTimelinePlaceholder')}</p>
        </div>
      )}
    </div>
  );
};

export default CodexPanel;
