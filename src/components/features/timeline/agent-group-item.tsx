import { ChevronRight } from 'lucide-react';
import type { ITimelineAgentGroup } from '@/types/timeline';

interface IAgentGroupItemProps {
  entry: ITimelineAgentGroup;
}

const AgentGroupItem = ({ entry }: IAgentGroupItemProps) => (
  <div className="animate-in fade-in duration-150">
    <div className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground">
      <ChevronRight size={14} className="shrink-0" />
      <span>{entry.description}</span>
    </div>
  </div>
);

export default AgentGroupItem;
