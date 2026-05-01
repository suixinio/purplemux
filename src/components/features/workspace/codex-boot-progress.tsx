import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, RotateCcw, TerminalSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import OpenAIIcon from '@/components/icons/openai-icon';
import { cn } from '@/lib/utils';

const ALMOST_READY_MS = 2_000;
const ERROR_THRESHOLD_MS = 5_000;
const TICK_INTERVAL_MS = 250;

interface ICodexBootProgressProps {
  className?: string;
  onRestart?: () => void;
  onShowTerminal?: () => void;
}

const CodexBootProgress = ({ className, onRestart, onShowTerminal }: ICodexBootProgressProps) => {
  const t = useTranslations('terminal');
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const isError = elapsedMs >= ERROR_THRESHOLD_MS;
  const isAlmostReady = elapsedMs >= ALMOST_READY_MS;

  if (isError) {
    return (
      <div
        className={cn(
          'flex h-full flex-col items-center justify-center gap-4 px-6 text-center',
          className,
        )}
        role="alert"
      >
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <div>
          <p className="text-base font-medium text-foreground">{t('codexBootFailed')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('codexBootFailedHint')}</p>
        </div>
        {(onRestart || onShowTerminal) && (
          <div className="flex gap-2">
            {onRestart && (
              <Button variant="default" size="sm" onClick={onRestart}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t('codexBootRestart')}
              </Button>
            )}
            {onShowTerminal && (
              <Button variant="outline" size="sm" onClick={onShowTerminal}>
                <TerminalSquare className="h-3.5 w-3.5" />
                {t('codexBootShowTerminal')}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center gap-5 px-6',
        className,
      )}
      role="status"
      aria-busy="true"
    >
      <OpenAIIcon
        size={32}
        className="text-foreground motion-safe:animate-spin motion-reduce:opacity-70 [animation-duration:1.5s]"
      />
      <div className="text-center" aria-live="polite">
        <p className="text-base font-medium text-foreground">
          {isAlmostReady ? t('codexBootAlmostReady') : t('codexBootMain')}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t('codexBootSubtitle')}</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2" aria-hidden="true">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
};

export default CodexBootProgress;
