import { useState } from 'react';
import { X, Plus, GitCompareArrows, Copy, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ClaudeCodeIcon from '@/components/icons/claude-code-icon';
import OpenAIIcon from '@/components/icons/openai-icon';
import TabStatusIndicator from '@/components/features/workspace/tab-status-indicator';
import CopyPaneDrawer from '@/components/features/workspace/copy-pane-drawer';
import useTabStore from '@/hooks/use-tab-store';
import ProcessIcon from '@/components/icons/process-icon';
import { cn } from '@/lib/utils';
import { getAgentPanelTypeFromProvider, isAgentPanel, isAgentRunning, tryAgentSwitch } from '@/lib/agent-switch-lock';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const iconButtonClassName = 'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';
const iconClassName = 'h-4 w-4 shrink-0';

type TModeButton = {
  type: Extract<TPanelType, 'terminal' | 'claude-code' | 'codex-cli'>;
  label: string;
  startAction?: boolean;
};

const canSwitchMode = (panelType: TPanelType) =>
  panelType === 'terminal' || panelType === 'claude-code' || panelType === 'codex-cli';

const getButtonLabel = (mode: TModeButton) =>
  mode.startAction ? `Start ${mode.label} Chat` : mode.label;

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
  const switchable = canSwitchMode(panelType);
  const runtimeAgentPanelType = getAgentPanelTypeFromProvider(tabEntry?.agentProviderId);
  const visibleAgentPanelType = isAgentPanel(panelType)
    ? panelType
    : isAgentRunning(tabEntry?.cliState)
      ? runtimeAgentPanelType
      : undefined;
  const modeButtons: TModeButton[] = [
    { type: 'terminal', label: 'Terminal' },
    ...(visibleAgentPanelType
      ? [{
          type: visibleAgentPanelType,
          label: 'Chat',
        }]
      : [
          { type: 'claude-code' as const, label: 'Claude', startAction: true },
          { type: 'codex-cli' as const, label: 'Codex', startAction: true },
        ]),
  ];
  const processColor = tabEntry?.terminalStatus === 'server'
    ? 'text-ui-green'
    : tabEntry?.terminalStatus === 'running'
      ? 'text-ui-blue'
      : 'text-muted-foreground/50';

  const renderTabIcon = () => {
    if (panelType === 'claude-code') return <ClaudeCodeIcon size={16} />;
    if (panelType === 'codex-cli') return <OpenAIIcon size={16} className="shrink-0 text-foreground" aria-label="Codex" />;
    if (panelType === 'diff') return <GitCompareArrows className={cn(iconClassName, 'text-muted-foreground')} />;
    if (panelType === 'agent-sessions') return <History className={cn(iconClassName, 'text-muted-foreground')} />;
    return (
      <ProcessIcon
        process={tabEntry?.currentProcess}
        className={cn(iconClassName, processColor)}
      />
    );
  };

  const handleSelectMode = (mode: TModeButton) => {
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
  };

  return (
    <div className="flex h-11 shrink-0 items-center border-b border-border/50 bg-background">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1">
          <TabStatusIndicator tabId={tabId} panelType={panelType} />
          {renderTabIcon()}
          <span className="min-w-0 flex-1 truncate text-xs text-foreground">{tabName}</span>
          {switchable && (
            <Select
              items={modeButtons.map((mode) => ({ value: mode.type, label: getButtonLabel(mode) }))}
              value={panelType}
              onValueChange={(value) => {
                const mode = modeButtons.find((item) => item.type === value);
                if (mode) handleSelectMode(mode);
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-7 rounded border-border/70 bg-muted/30 px-2 text-xs text-muted-foreground"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-36">
                {modeButtons.map((mode) => (
                  <SelectItem key={mode.type} value={mode.type}>
                    {getButtonLabel(mode)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 pr-0.5">
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
