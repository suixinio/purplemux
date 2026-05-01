import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ITimelineMcpToolCall, TToolStatus } from '@/types/timeline';

interface IMcpToolCallItemProps {
  entry: ITimelineMcpToolCall;
}

const STATUS_COLOR: Record<TToolStatus, string> = {
  pending: 'text-ui-amber',
  success: 'text-ui-purple',
  error: 'text-negative',
};

const McpToolCallItem = ({ entry }: IMcpToolCallItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const statusColor = STATUS_COLOR[entry.status];
  const statusPulse = entry.status === 'pending' ? 'animate-pulse' : '';
  const hasDetails = !!(entry.argumentsSummary || entry.resultSummary);

  return (
    <div className="animate-in fade-in py-1 duration-150" role="article">
      <div className="flex items-start gap-1.5">
        <Plug size={12} className={cn('mt-0.5 shrink-0', statusColor, statusPulse)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
            <span className="font-medium text-foreground/90">MCP</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-foreground/80">{entry.server || '?'}</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="font-mono text-foreground/80 break-all">{entry.tool}</span>
          </div>
          {hasDetails && (
            <>
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-expanded={isOpen}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <span>{isOpen ? '숨기기' : '자세히 보기'}</span>
              </button>
              {isOpen && (
                <div className="mt-1.5 space-y-1 rounded border border-border/40 bg-muted/40 p-2 font-mono text-[11px]">
                  {entry.argumentsSummary && (
                    <div>
                      <div className="text-muted-foreground/70">arguments</div>
                      <div className="whitespace-pre-wrap break-words text-foreground/90">
                        {entry.argumentsSummary}
                      </div>
                    </div>
                  )}
                  {entry.resultSummary && (
                    <div>
                      <div className="text-muted-foreground/70">result</div>
                      <div className="whitespace-pre-wrap break-words text-foreground/90">
                        {entry.resultSummary}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(McpToolCallItem);
