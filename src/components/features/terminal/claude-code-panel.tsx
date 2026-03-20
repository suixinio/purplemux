import { cn } from '@/lib/utils';

interface IClaudeCodePanelProps {
  sessionName: string;
  className?: string;
}

const ClaudeCodePanel = ({ sessionName, className }: IClaudeCodePanelProps) => (
  <div className={cn('flex h-full w-full flex-col', className)}>
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>
      <span className="text-xs text-muted-foreground">
        Claude Code 패널 로딩 중... ({sessionName})
      </span>
    </div>
  </div>
);

export default ClaudeCodePanel;
