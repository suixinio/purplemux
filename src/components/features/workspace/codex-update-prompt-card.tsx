import { useTranslations } from 'next-intl';
import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OpenAIIcon from '@/components/icons/openai-icon';
import type { ICodexUpdatePromptInfo, TCodexUpdateAnswer } from '@/lib/codex-update-prompt-detector';

interface ICodexUpdatePromptCardProps {
  prompt: ICodexUpdatePromptInfo;
  onRespond: (answer: TCodexUpdateAnswer) => void;
}

const CodexUpdatePromptCard = ({ prompt, onRespond }: ICodexUpdatePromptCardProps) => {
  const t = useTranslations('terminal');
  const versionText = prompt.currentVersion && prompt.latestVersion
    ? t('codexUpdateVersion', { current: prompt.currentVersion, latest: prompt.latestVersion })
    : null;

  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-border bg-background p-4 text-left shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
          <OpenAIIcon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{t('codexUpdateTitle')}</p>
          {versionText && <p className="mt-0.5 text-xs text-muted-foreground">{versionText}</p>}
          <p className="mt-2 text-sm text-muted-foreground">
            {prompt.status === 'success'
              ? t('codexUpdateSuccess')
              : prompt.status === 'updating'
                ? t('codexUpdateRunning')
                : t('codexUpdateDescription')}
          </p>
          {prompt.updateCommand && prompt.status === 'prompt' && (
            <p className="mt-2 break-all rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {prompt.updateCommand}
            </p>
          )}
        </div>
      </div>

      {prompt.status === 'prompt' && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Button size="sm" onClick={() => onRespond('update')}>
            <Download className="h-3.5 w-3.5" />
            {t('codexUpdateNow')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRespond('skip')}>
            {t('codexUpdateSkip')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onRespond('skip-version')}>
            {t('codexUpdateSkipVersion')}
          </Button>
        </div>
      )}

      {prompt.status === 'updating' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('codexUpdateRunningHint')}
        </div>
      )}

      {prompt.status === 'success' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          {t('codexUpdateRestarting')}
        </div>
      )}
    </div>
  );
};

export default CodexUpdatePromptCard;
