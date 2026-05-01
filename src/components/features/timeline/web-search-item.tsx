import { memo } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ITimelineWebSearch, TToolStatus } from '@/types/timeline';

interface IWebSearchItemProps {
  entry: ITimelineWebSearch;
}

const STATUS_COLOR: Record<TToolStatus, string> = {
  pending: 'text-ui-amber',
  success: 'text-ui-teal',
  error: 'text-negative',
};

const WebSearchItem = ({ entry }: IWebSearchItemProps) => {
  const statusColor = STATUS_COLOR[entry.status];
  const statusPulse = entry.status === 'pending' ? 'animate-pulse' : '';
  const summary =
    entry.resultsSummary
      ?? (entry.resultCount != null ? `${entry.resultCount} results` : null);

  return (
    <div className="animate-in fade-in py-1 duration-150" role="article">
      <div className="flex items-start gap-1.5">
        <Globe size={12} className={cn('mt-0.5 shrink-0', statusColor, statusPulse)} />
        <div className="min-w-0 flex-1">
          <div className="text-xs">
            <span className="text-muted-foreground">웹 검색</span>
            {entry.query && (
              <span className="ml-1.5 font-mono text-foreground/90 break-all">
                &ldquo;{entry.query}&rdquo;
              </span>
            )}
          </div>
          {summary && (
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">{summary}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(WebSearchItem);
