import { useMemo } from 'react';

interface IActivitySummaryProps {
  runningTasks: number;
  completedTasks: number;
  uptimeSeconds: number;
}

const formatUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const ActivitySummary = ({ runningTasks, completedTasks, uptimeSeconds }: IActivitySummaryProps) => {
  const uptime = useMemo(() => formatUptime(uptimeSeconds), [uptimeSeconds]);

  return (
    <div className="mb-4 flex gap-6 rounded-lg border px-4 py-3">
      <div>
        <div className="text-xs text-muted-foreground">실행 중</div>
        <div className="text-lg font-semibold tabular-nums text-ui-teal">{runningTasks}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">완료</div>
        <div className="text-lg font-semibold tabular-nums text-positive">{completedTasks}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">가동</div>
        <div className="text-lg font-semibold tabular-nums text-foreground">{uptime}</div>
      </div>
    </div>
  );
};

export default ActivitySummary;
