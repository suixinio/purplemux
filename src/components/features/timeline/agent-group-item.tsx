import dayjs from 'dayjs';
import type { ITimelineAgentGroup } from '@/types/timeline';

interface IAgentGroupItemProps {
  entry: ITimelineAgentGroup;
}

const AgentGroupItem = ({ entry }: IAgentGroupItemProps) => (
  <div className="animate-in fade-in duration-150">
    <div className="rounded-md bg-muted/30 px-3 py-1.5 text-muted-foreground">
      <span className="text-[10px] text-muted-foreground/60">{dayjs(entry.timestamp).format('HH:mm')}</span>
      <div className="text-xs">
        ▸ Agent: {entry.agentType} — {entry.description}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        ({entry.entryCount} 단계 완료)
      </div>
    </div>
  </div>
);

export default AgentGroupItem;
