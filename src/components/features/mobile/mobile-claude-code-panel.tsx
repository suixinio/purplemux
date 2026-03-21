import ClaudeCodePanel from '@/components/features/terminal/claude-code-panel';
import WebInputBar from '@/components/features/terminal/web-input-bar';
import type { TCliState } from '@/types/timeline';

interface IMobileClaudeCodePanelProps {
  sessionName: string;
  claudeSessionId?: string | null;
  cliState: TCliState;
  inputVisible: boolean;
  sendStdin: (data: string) => void;
  terminalWsConnected: boolean;
  focusTerminal: () => void;
  focusInputRef: React.MutableRefObject<(() => void) | undefined>;
  onCliStateChange: (state: TCliState) => void;
  onInputVisibleChange: (visible: boolean) => void;
  processHintRef: React.MutableRefObject<((isClaudeRunning: boolean) => void) | undefined>;
}

const MobileClaudeCodePanel = ({
  sessionName,
  claudeSessionId,
  cliState,
  inputVisible,
  sendStdin,
  terminalWsConnected,
  focusTerminal,
  focusInputRef,
  onCliStateChange,
  onInputVisibleChange,
  processHintRef,
}: IMobileClaudeCodePanelProps) => {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted">
      <ClaudeCodePanel
        sessionName={sessionName}
        claudeSessionId={claudeSessionId}
        className="min-h-0 flex-1"
        onCliStateChange={onCliStateChange}
        onInputVisibleChange={onInputVisibleChange}
        processHintRef={processHintRef}
      />

      <div className="shrink-0">
        <WebInputBar
          cliState={cliState}
          sendStdin={sendStdin}
          terminalWsConnected={terminalWsConnected}
          visible={inputVisible}
          focusTerminal={focusTerminal}
          focusInputRef={focusInputRef}
        />
      </div>
    </div>
  );
};

export default MobileClaudeCodePanel;
