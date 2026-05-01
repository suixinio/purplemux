import { memo } from 'react';
import { Combine } from 'lucide-react';
import type { ITimelineContextCompacted } from '@/types/timeline';

interface IContextCompactedItemProps {
  entry: ITimelineContextCompacted;
}

const formatTokens = (n?: number): string => {
  if (n == null) return '?';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const ContextCompactedItem = ({ entry }: IContextCompactedItemProps) => {
  const before = entry.beforeTokens;
  const after = entry.afterTokens;
  const reduction =
    before != null && after != null && before > 0
      ? Math.round(((before - after) / before) * 100)
      : null;

  return (
    <div className="animate-in fade-in flex items-center gap-1.5 py-1 text-xs text-muted-foreground/70 duration-150">
      <Combine size={12} className="shrink-0" />
      <span>컨텍스트 압축</span>
      {before != null && after != null && (
        <span className="tabular-nums">
          {formatTokens(before)} → {formatTokens(after)} tokens
          {reduction != null && reduction > 0 && (
            <span className="ml-1 text-muted-foreground/60">(-{reduction}%)</span>
          )}
        </span>
      )}
    </div>
  );
};

export default memo(ContextCompactedItem);
