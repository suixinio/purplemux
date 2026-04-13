import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { ITimelineUserMessage } from '@/types/timeline';

interface IUserMessageItemProps {
  entry: ITimelineUserMessage;
}

const UserMessageItem = ({ entry }: IUserMessageItemProps) => (
  <div className="animate-in fade-in duration-150 flex justify-end">
    <div
      className={cn(
        'bg-ui-blue/10 rounded-lg px-4 py-2.5 max-w-[85%]',
        entry.pending && 'opacity-50',
      )}
    >
      <p className="text-sm whitespace-pre-wrap break-words">{entry.text}</p>
    </div>
  </div>
);

export default memo(UserMessageItem);
