import { Check, ChevronDown, Plus, TerminalSquare } from 'lucide-react';
import { useState } from 'react';
import ClaudeCodeIcon from '@/components/icons/claude-code-icon';
import OpenAIIcon from '@/components/icons/openai-icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import useTabStore from '@/hooks/use-tab-store';
import { getAgentPanelTypeFromProvider, isAgentPanel, isAgentRunning, tryAgentSwitch } from '@/lib/agent-switch-lock';
import { cn } from '@/lib/utils';
import type { TPanelType } from '@/types/terminal';

type TModeButton = {
  type: Extract<TPanelType, 'terminal' | 'claude-code' | 'codex-cli'>;
  label: string;
  startAction?: boolean;
};

interface IAgentModeSwitcherProps {
  tabId: string;
  paneId?: string;
  panelType: TPanelType;
  onSwitchPanelType: (type: TPanelType) => void;
}

const getButtonLabel = (mode: TModeButton) =>
  mode.startAction ? `Start ${mode.label}` : mode.label;

const iconClassName = 'h-3.5 w-3.5 shrink-0';

const getCurrentMode = (panelType: TPanelType): TModeButton => {
  if (panelType === 'claude-code') return { type: 'claude-code', label: 'Claude' };
  if (panelType === 'codex-cli') return { type: 'codex-cli', label: 'Codex' };
  return { type: 'terminal', label: 'Terminal' };
};

const AgentModeSwitcher = ({
  tabId,
  paneId,
  panelType,
  onSwitchPanelType,
}: IAgentModeSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const tabEntry = useTabStore((s) => s.tabs[tabId]);
  const runtimeAgentPanelType = getAgentPanelTypeFromProvider(tabEntry?.agentProviderId);
  const visibleAgentPanelType = isAgentPanel(panelType)
    ? panelType
    : isAgentRunning(tabEntry?.cliState)
      ? runtimeAgentPanelType
      : undefined;
  const currentMode = getCurrentMode(panelType);
  const modeButtons: TModeButton[] = [
    { type: 'terminal', label: 'Terminal' },
    ...(visibleAgentPanelType
      ? [{
          type: visibleAgentPanelType,
          label: visibleAgentPanelType === 'codex-cli' ? 'Codex' : 'Claude',
        }]
      : [
          { type: 'claude-code' as const, label: 'Claude', startAction: true },
          { type: 'codex-cli' as const, label: 'Codex', startAction: true },
        ]),
  ];

  const renderIcon = (mode: TModeButton) => {
    if (mode.type === 'terminal') return <TerminalSquare className={iconClassName} />;
    if (mode.type === 'claude-code') return <ClaudeCodeIcon size={14} />;
    return <OpenAIIcon size={14} className="shrink-0" aria-label="Codex" />;
  };

  const handleSelectMode = (mode: TModeButton) => {
    if (panelType === mode.type) {
      setOpen(false);
      return;
    }
    if (!tryAgentSwitch({
      current: panelType,
      target: mode.type,
      cliState: tabEntry?.cliState,
      runningAgentPanelType: runtimeAgentPanelType,
    })) return;
    setOpen(false);
    if (mode.startAction && (mode.type === 'claude-code' || mode.type === 'codex-cli')) {
      window.dispatchEvent(new CustomEvent('purplemux-start-agent', {
        detail: {
          paneId,
          tabId,
          provider: mode.type === 'codex-cli' ? 'codex' : 'claude',
        },
      }));
      return;
    }
    onSwitchPanelType(mode.type);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="ml-auto flex h-6 shrink-0 items-center gap-1.5 rounded border border-border/80 bg-background/70 px-1.5 text-[10px] text-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Select tab mode"
        title="Select tab mode"
        onClick={(e) => e.stopPropagation()}
      >
        {renderIcon(currentMode)}
        <span>{currentMode.label}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-44 gap-0 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 py-1.5 text-[10px] font-medium uppercase text-muted-foreground">
          View as
        </div>
        {modeButtons.map((mode) => {
          const active = panelType === mode.type;
          return (
            <button
              key={mode.type}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent',
                active && 'bg-accent',
              )}
              aria-pressed={active}
              aria-label={getButtonLabel(mode)}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectMode(mode);
              }}
            >
              {renderIcon(mode)}
              <span className="min-w-0 flex-1 truncate">{getButtonLabel(mode)}</span>
              {mode.startAction && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Plus className="h-2.5 w-2.5" />
                </span>
              )}
              {active && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

export default AgentModeSwitcher;
