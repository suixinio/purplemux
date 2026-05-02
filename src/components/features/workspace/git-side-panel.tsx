import DiffPanel from '@/components/features/workspace/diff-panel';
import type { TGitAskProvider } from '@/hooks/use-config-store';
import type { IDiffSettings } from '@/types/terminal';

interface IGitSidePanelProps {
  sessionName?: string;
  onClose: () => void;
  onSendToAgent?: (text: string, provider: TGitAskProvider) => void;
  settings?: IDiffSettings;
  onSettingsChange?: (patch: Partial<IDiffSettings>) => void;
}

const GitSidePanel = ({ sessionName, onClose, onSendToAgent, settings, onSettingsChange }: IGitSidePanelProps) => (
  <aside className="flex h-full min-w-0 flex-col bg-card">
    <div className="min-h-0 flex-1">
      {sessionName ? (
        <DiffPanel
          sessionName={sessionName}
          onSendToAgent={onSendToAgent}
          onClose={onClose}
          settings={settings}
          onSettingsChange={onSettingsChange}
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
