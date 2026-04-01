import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISCONNECT_MESSAGES = {
  'session-not-found': '세션을 찾을 수 없습니다',
} as const;

interface IPaneDisconnectedOverlayProps {
  cwd?: string;
  lastCommand?: string | null;
  onRestartWithCommand: (command: string) => void;
  onRestartNew: () => void;
}

const PaneDisconnectedOverlay = ({
  cwd,
  lastCommand,
  onRestartWithCommand,
  onRestartNew,
}: IPaneDisconnectedOverlayProps) => (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
    <WifiOff className="h-5 w-5 text-muted-foreground" />
    <span className="text-sm text-muted-foreground">
      {DISCONNECT_MESSAGES['session-not-found']}
    </span>
    <div className="flex flex-col items-center gap-3">
      {cwd && (
        <span className="max-w-72 truncate text-xs text-muted-foreground/60">
          {cwd.replace(/^\/Users\/[^/]+/, '~')}
        </span>
      )}
      {lastCommand && (
        <div className="flex flex-col items-center gap-2">
          <code className="max-w-64 truncate rounded bg-muted px-2 py-1 text-xs">
            {lastCommand}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestartWithCommand(lastCommand)}
          >
            이 커맨드로 시작
          </Button>
        </div>
      )}
      {lastCommand && (
        <div className="flex w-40 items-center gap-2 text-muted-foreground/40">
          <div className="h-px flex-1 bg-current" />
          <span className="text-[11px]">또는</span>
          <div className="h-px flex-1 bg-current" />
        </div>
      )}
      <Button variant="outline" size="sm" onClick={onRestartNew}>
        새 터미널로 시작
      </Button>
    </div>
  </div>
);

export default PaneDisconnectedOverlay;
