import { memo } from 'react';
import { Brain, Info } from 'lucide-react';
import type { ITimelineReasoningSummary } from '@/types/timeline';

interface IReasoningSummaryItemProps {
  entry: ITimelineReasoningSummary;
}

const ReasoningSummaryItem = ({ entry }: IReasoningSummaryItemProps) => {
  const hasSummary = entry.summary.length > 0;

  return (
    <div className="animate-in fade-in py-1 duration-150" role="article">
      <div className="rounded-md border border-border/40 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Brain size={12} className="shrink-0" />
          <span className="font-medium">Reasoning</span>
        </div>
        {hasSummary && (
          <ul className="mt-1.5 ml-1 space-y-0.5 text-xs text-foreground/80">
            {entry.summary.map((line, idx) => (
              <li key={idx} className="whitespace-pre-wrap break-words">
                {line}
              </li>
            ))}
          </ul>
        )}
        {entry.hasEncryptedContent && (
          <div className="mt-2 flex items-start gap-1.5 border-t border-border/40 pt-1.5 text-[11px] text-muted-foreground/80">
            <Info size={10} className="mt-0.5 shrink-0" />
            <span>상세한 reasoning은 표시되지 않습니다 (encrypted)</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ReasoningSummaryItem);
