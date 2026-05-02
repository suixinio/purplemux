import { useState } from 'react';
import { X, Plus, GitCompareArrows, Copy, TerminalSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ClaudeCodeIcon from '@/components/icons/claude-code-icon';
import OpenAIIcon from '@/components/icons/openai-icon';
import TabStatusIndicator from '@/components/features/workspace/tab-status-indicator';
import { getAgentPanelTypeFromProvider, isAgentPanel, isAgentRunning, tryAgentSwitch } from '@/lib/agent-switch-lock';
import CopyPaneDrawer from '@/components/features/workspace/copy-pane-drawer';
import useTabStore from '@/hooks/use-tab-store';
import ProcessIcon from '@/components/icons/process-icon';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { TPanelType } from '@/types/terminal';

type TModeButton = {
  type: TPanelType;
  label: string;
  startAction?: boolean;
};

const iconButtonClassName = 'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';
const activeIconButtonClassName = 'bg-accent text-foreground';
const iconClassName = 'h-4 w-4 shrink-0';

interface IMobileTabHeaderProps {
  tabId: string;
  tabName: string;
  sessionName: string | null;
  panelType: TPanelType;
  onSwitchPanelType: (type: TPanelType) => void;
  onCreateTab: () => void;
  onOpenGit: () => void;
  onClose: () => void;
}

const MobileTabHeader = ({
  tabId,
  tabName,
  sessionName,
  panelType,
  onSwitchPanelType,
  onCreateTab,
  onOpenGit,
  onClose,
}: IMobileTabHeaderProps) => {
  const t = useTranslations('mobile');
  const tc = useTranslations('common');
  const tt = useTranslations('terminal');
  const [copyOpen, setCopyOpen] = useState(false);
  const showCopy = panelType === 'terminal' && !!sessionName;
  const tabEntry = useTabStore((s) => s.tabs[tabId]);
  const runtimeAgentPanelType = getAgentPanelTypeFromProvider(tabEntry?.agentProviderId);
  const visibleAgentPanelType = isAgentPanel(panelType)
    ? panelType
    : isAgentRunning(tabEntry?.cliState)
      ? runtimeAgentPanelType
      : undefined;
  const modeButtons: TModeButton[] = [
    { type: 'terminal', label: 'TERMINAL' },
    ...(visibleAgentPanelType
      ? [{
          type: visibleAgentPanelType,
          label: visibleAgentPanelType === 'codex-cli' ? 'CODEX' : 'CLAUDE',
        }]
      : [
          { type: 'claude-code' as const, label: 'CLAUDE', startAction: true },
          { type: 'codex-cli' as const, label: 'CODEX', startAction: true },
        ]),
  ];
  const getModeButtonLabel = (mode: TModeButton) =>
    mode.startAction ? `Start ${mode.label[0]}${mode.label.slice(1).toLowerCase()}` : mode.label[0] + mode.label.slice(1).toLowerCase();
  const renderModeIcon = (mode: TModeButton) => {
    const icon = mode.type === 'terminal' ? (
      <TerminalSquare className={iconClassName} />
    ) : mode.type === 'claude-code' ? (
      <ClaudeCodeIcon size={16} />
    ) : mode.type === 'codex-cli' ? (
      <OpenAIIcon size={16} className="shrink-0" aria-label="Codex" />
    ) : null;

    if (!mode.startAction) return icon;
    return (
      <>
        {icon}
        <span className="absolute right-1 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <Plus className="h-2 w-2 text-muted-foreground" />
        </span>
      </>
    );
  };
  const processColor = tabEntry?.terminalStatus === 'server'
    ? 'text-ui-green'
    : tabEntry?.terminalStatus === 'running'
      ? 'text-ui-blue'
      : 'text-muted-foreground/50';

  return (
    <div className="flex h-10 shrink-0 items-center border-b border-border/50 bg-background">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <TabStatusIndicator tabId={tabId} panelType={panelType} />
        {panelType === 'claude-code' ? (
          <ClaudeCodeIcon size={16} />
        ) : panelType === 'codex-cli' ? (
          <OpenAIIcon size={16} className="shrink-0 text-foreground" aria-label="Codex" />
        ) : panelType === 'diff' ? (
          <GitCompareArrows className={cn(iconClassName, 'text-muted-foreground')} />
        ) : (
          <ProcessIcon
            process={tabEntry?.currentProcess}
            className={cn(iconClassName, processColor)}
          />
        )}
        <span className="truncate text-xs text-foreground">{tabName}</span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 pr-0.5">
        <div className="flex items-center gap-px">
          {modeButtons.map((mode) => (
            <button
              key={mode.type}
              className={cn(
                iconButtonClassName,
                panelType === mode.type && activeIconButtonClassName,
              )}
              aria-label={getModeButtonLabel(mode)}
              title={getModeButtonLabel(mode)}
              onClick={() => {
                if (panelType === mode.type) return;
                if (!tryAgentSwitch({
                  current: panelType,
                  target: mode.type,
                  cliState: tabEntry?.cliState,
                  runningAgentPanelType: runtimeAgentPanelType,
                })) return;
                if (mode.startAction && (mode.type === 'claude-code' || mode.type === 'codex-cli')) {
                  window.dispatchEvent(new CustomEvent('purplemux-start-agent', {
                    detail: {
                      tabId,
                      provider: mode.type === 'codex-cli' ? 'codex' : 'claude',
                    },
                  }));
                  return;
                }
                onSwitchPanelType(mode.type);
              }}
            >
              {renderModeIcon(mode)}
            </button>
          ))}
        </div>

        {showCopy && (
          <button
            className={iconButtonClassName}
            onClick={() => setCopyOpen(true)}
            aria-label={tt('copyPaneLabel')}
            title={tt('copyPaneLabel')}
          >
            <Copy className={iconClassName} />
          </button>
        )}

        <button
          className={iconButtonClassName}
          onClick={onOpenGit}
          aria-label="Open Git"
          title="Open Git"
        >
          <GitCompareArrows className={iconClassName} />
        </button>

        <button
          className={iconButtonClassName}
          onClick={onCreateTab}
          aria-label={t('newTab')}
          title={t('newTab')}
        >
          <Plus className={iconClassName} />
        </button>

        <AlertDialog>
          <AlertDialogTrigger
            className={cn(iconButtonClassName, 'hover:text-ui-red')}
            aria-label={t('closeTab')}
            title={t('closeTab')}
          >
            <X className={iconClassName} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('closeTab')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('closeTabConfirm', { name: tabName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-ui-red hover:bg-ui-red/80"
                onClick={onClose}
              >
                {tc('close')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <CopyPaneDrawer
        open={copyOpen}
        onOpenChange={setCopyOpen}
        sessionName={sessionName}
      />
    </div>
  );
};

export default MobileTabHeader;
