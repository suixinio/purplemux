import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import type { TPanelType } from '@/types/terminal';
import type { TCliState } from '@/types/timeline';

const isAgentPanel = (panelType: TPanelType | undefined): boolean =>
  panelType === 'claude-code' || panelType === 'codex-cli';

const isAgentRunning = (cliState: TCliState | undefined): boolean =>
  cliState !== undefined && cliState !== 'inactive' && cliState !== 'unknown';

const agentDisplayName = (panelType: TPanelType | undefined): string => {
  if (panelType === 'claude-code') return 'Claude';
  if (panelType === 'codex-cli') return 'Codex';
  return '';
};

interface IAgentSwitchInput {
  current: TPanelType | undefined;
  target: TPanelType;
  cliState: TCliState | undefined;
}

export const isAgentSwitchBlocked = ({
  current,
  target,
  cliState,
}: IAgentSwitchInput): boolean => {
  if (!current || current === target) return false;
  if (!isAgentPanel(current) || !isAgentPanel(target)) return false;
  return isAgentRunning(cliState);
};

export const tryAgentSwitch = (input: IAgentSwitchInput): boolean => {
  if (!isAgentSwitchBlocked(input)) return true;
  const name = agentDisplayName(input.current);
  toast.error(t('terminal', 'switchAgentBlocked').replace('{name}', name), {
    id: 'agent-switch-blocked',
    duration: 5000,
  });
  return false;
};
