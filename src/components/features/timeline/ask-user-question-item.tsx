import { MessageCircleQuestion, Check, TerminalSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ITimelineAskUserQuestion } from '@/types/timeline';

interface IAskUserQuestionItemProps {
  entry: ITimelineAskUserQuestion;
}

const AskUserQuestionItem = ({ entry }: IAskUserQuestionItemProps) => {
  const isAnswered = entry.status === 'success';
  const question = entry.questions[0];

  if (!question) return null;

  return (
    <div className="animate-in fade-in duration-150">
      <div className="rounded-lg border border-ui-purple/20 bg-ui-purple/5 px-4 py-3">
        <div className="mb-2.5 flex items-center gap-2 text-xs font-medium text-ui-purple">
          <MessageCircleQuestion size={14} />
          <span>{question.header}</span>
        </div>

        <p className="mb-3 text-sm">{question.question}</p>

        <div className="flex flex-col gap-1.5">
          {question.options.map((option, idx) => {
            const isSelected = isAnswered && entry.answer === option.label;

            return (
              <div
                key={idx}
                className={cn(
                  'flex items-start gap-2.5 rounded-md border px-3 py-2 text-sm',
                  isSelected
                    ? 'border-ui-purple/40 bg-ui-purple/10'
                    : isAnswered
                      ? 'border-border/30 opacity-50'
                      : 'border-border/50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-medium',
                    isSelected
                      ? 'bg-ui-purple text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {isSelected ? <Check size={12} /> : idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{option.label}</span>
                  {option.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!isAnswered && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TerminalSquare size={12} />
            <span>터미널에서 선택하세요</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AskUserQuestionItem;
