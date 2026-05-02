import DiffPanel from '@/components/features/workspace/diff-panel';
import type { TGitAskProvider } from '@/hooks/use-config-store';

interface IGitSidePanelProps {
  sessionName?: string;
  onClose: () => void;
  onSendToAgent?: (text: string, provider: TGitAskProvider) => void;
}

const GitSidePanel = ({ sessionName, onClose, onSendToAgent }: IGitSidePanelProps) => (
  <aside className="flex h-full min-w-0 flex-col bg-card">
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
  </aside>
);

export default GitSidePanel;
