import DiffPanel from '@/components/features/workspace/diff-panel';
import type { TGitAskProvider } from '@/hooks/use-config-store';

interface IMobileGitFullscreenProps {
  open: boolean;
  sessionName?: string;
  onClose: () => void;
  onSendToAgent?: (text: string, provider: TGitAskProvider) => void;
}

const MobileGitFullscreen = ({
  open,
  sessionName,
  onClose,
  onSendToAgent,
}: IMobileGitFullscreenProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-card text-foreground">
      <div className="min-h-0 flex-1">
        {sessionName ? (
          <DiffPanel
            sessionName={sessionName}
            onSendToAgent={onSendToAgent}
            onClose={onClose}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Open a terminal or agent tab first.
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileGitFullscreen;
