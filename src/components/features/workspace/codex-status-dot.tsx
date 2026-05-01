import { useTranslations } from 'next-intl';
import Spinner from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { TCliState } from '@/types/timeline';

interface ICodexStatusDotProps {
  cliState: TCliState;
  className?: string;
}

const CodexStatusDot = ({ cliState, className }: ICodexStatusDotProps) => {
  const t = useTranslations('terminal');

  if (cliState === 'busy') {
    return (
      <span className={cn('inline-flex items-center gap-1', className)} role="status">
        <Spinner className="h-2.5 w-2.5 text-ui-amber" />
        <span className="sr-only">{t('statusBusy')}</span>
      </span>
    );
  }
  if (cliState === 'needs-input') {
    return (
      <span className={cn('inline-flex items-center', className)} role="status">
        <span
          className="h-2 w-2 rounded-full bg-ui-blue transition-colors duration-200 motion-safe:animate-pulse"
          aria-hidden="true"
        />
        <span className="sr-only">{t('statusNeedsInput')}</span>
      </span>
    );
  }
  if (cliState === 'ready-for-review') {
    return (
      <span className={cn('inline-flex items-center', className)} role="status">
        <span
          className="h-2 w-2 rounded-full bg-claude-active transition-colors duration-200 motion-safe:animate-pulse"
          aria-hidden="true"
        />
        <span className="sr-only">{t('statusNeedsReview')}</span>
      </span>
    );
  }
  if (cliState === 'idle') {
    return (
      <span className={cn('inline-flex items-center', className)} role="status">
        <span
          className="h-2 w-2 rounded-full bg-ui-green transition-colors duration-200"
          aria-hidden="true"
        />
        <span className="sr-only">idle</span>
      </span>
    );
  }
  return null;
};

export default CodexStatusDot;
