import { useState, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import MissionProgress from '@/components/features/agent/mission-progress';
import TaskTree from '@/components/features/agent/task-tree';
import type { IMission, TMissionStatus } from '@/types/mission';

interface IMissionCardProps {
  mission: IMission;
  agentId: string;
  defaultExpanded?: boolean;
  completing?: boolean;
}

const statusBadge: Record<TMissionStatus, { label: string; className: string }> = {
  pending: { label: '대기', className: 'text-muted-foreground' },
  running: { label: '진행 중', className: 'text-ui-teal' },
  blocked: { label: '차단됨', className: 'text-ui-amber' },
  completed: { label: '완료', className: 'text-positive' },
  failed: { label: '실패', className: 'text-negative' },
};

const MissionCard = ({ mission, agentId, defaultExpanded = true, completing }: IMissionCardProps) => {
  const badge = statusBadge[mission.status];
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className={cn('rounded-lg border p-4 mb-3 transition-opacity duration-500', completing && 'opacity-50')}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5"
          onClick={toggleExpanded}
        >
          <ChevronRight
            size={14}
            className={cn(
              'text-muted-foreground transition-transform',
              expanded && 'rotate-90',
            )}
          />
          <span className="text-sm font-medium">{mission.title}</span>
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {dayjs(mission.createdAt).format('MM/DD')}
        </span>
        <span className={cn('text-xs', badge.className)}>{badge.label}</span>
      </div>

      <div className="mt-2">
        <MissionProgress tasks={mission.tasks} status={mission.status} />
      </div>

      {expanded && (
        <TaskTree
          tasks={mission.tasks}
          agentId={agentId}
          missionId={mission.id}
          collapsible
        />
      )}
    </div>
  );
};

export default MissionCard;
