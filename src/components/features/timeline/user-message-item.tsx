import dayjs from 'dayjs';
import type { ITimelineUserMessage } from '@/types/timeline';

interface IUserMessageItemProps {
  entry: ITimelineUserMessage;
}

const UserMessageItem = ({ entry }: IUserMessageItemProps) => (
  <div className="animate-in fade-in duration-150">
    <div className="border-l-2 border-ui-blue bg-ui-blue/10 px-3 py-2">
      <span className="text-[10px] text-muted-foreground/60">{dayjs(entry.timestamp).format('HH:mm')}</span>
      <p className="mt-0.5 text-xs whitespace-pre-wrap break-words">{entry.text}</p>
    </div>
  </div>
);

export default UserMessageItem;
