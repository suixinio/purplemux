import type { TAgentStatus } from '@/types/agent';

interface IBrainSessionCardProps {
  tmuxSession: string;
  status: TAgentStatus;
}

const statusLabel: Record<TAgentStatus, string> = {
  idle: '대기 중',
  working: '계획 수립 중',
  blocked: '차단됨',
  offline: '오프라인',
};

const statusIcon: Record<TAgentStatus, React.ReactNode> = {
  idle: (
    <span className="inline-block h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />
  ),
  working: (
    <span className="flex h-3.5 w-3.5 items-center justify-center">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ui-teal" />
    </span>
  ),
  blocked: (
    <span className="flex h-3.5 w-3.5 items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full bg-ui-amber" />
    </span>
  ),
  offline: (
    <span className="flex h-3.5 w-3.5 items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
    </span>
  ),
};

const BrainSessionCard = ({ tmuxSession, status }: IBrainSessionCardProps) => (
  <div className="mb-4 rounded-lg border bg-muted/30 p-3">
    <div className="flex items-center gap-2">
      {statusIcon[status]}
      <span className="text-sm font-medium">{statusLabel[status]}</span>
    </div>
    <div className="mt-1 text-xs text-muted-foreground">{tmuxSession} 세션</div>
  </div>
);

export default BrainSessionCard;
