import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ITimelineExecCommandStream, TToolStatus } from '@/types/timeline';

interface IExecCommandStreamItemProps {
  entry: ITimelineExecCommandStream;
}

const formatDuration = (ms?: number): string | null => {
  if (ms == null || !Number.isFinite(ms)) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};

const STATUS_COLOR: Record<TToolStatus, string> = {
  pending: 'text-ui-amber',
  success: 'text-muted-foreground',
  error: 'text-negative',
};

const ExecCommandStreamItem = ({ entry }: IExecCommandStreamItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const stdout = entry.stdout ?? '';
  const stderr = entry.stderr ?? '';
  const hasOutput = stdout.length > 0 || stderr.length > 0;
  const duration = formatDuration(entry.durationMs);
  const command = entry.parsedCommand ?? entry.command;
  const statusColor = STATUS_COLOR[entry.status];
  const statusPulse = entry.status === 'pending' ? 'animate-pulse' : '';

  return (
    <div className="animate-in fade-in py-1 duration-150" role="article">
      <div className="flex items-start gap-1.5">
        <Terminal size={12} className={cn('mt-0.5 shrink-0', statusColor, statusPulse)} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-mono break-all">
            <span className="text-muted-foreground">$ </span>
            <span>{command}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
            {entry.exitCode != null && (
              <span className={entry.exitCode === 0 ? '' : 'text-negative'}>
                exit {entry.exitCode}
              </span>
            )}
            {duration && <span>· {duration}</span>}
            {entry.truncated && <span>· truncated</span>}
          </div>
        </div>
      </div>
      {hasOutput && (
        <>
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            aria-expanded={isOpen}
            className="ml-4 mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <span>{isOpen ? '출력 숨기기' : '출력 보기'}</span>
          </button>
          {isOpen && (
            <div className="ml-4 mt-1.5 max-h-[320px] overflow-auto rounded border border-border/40 bg-muted/40 p-2 font-mono text-[11px]">
              {stdout && (
                <pre className="whitespace-pre-wrap break-words text-foreground/90">{stdout}</pre>
              )}
              {stderr && (
                <pre className="mt-2 whitespace-pre-wrap break-words text-negative/80">{stderr}</pre>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default memo(ExecCommandStreamItem);
