import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';

const CODEX_INSTALL_COMMAND = 'npm i -g @openai/codex';
const CODEX_CONFIG_PATH = '~/.codex/config.toml';
const CONFIG_DEDUP_KEY = 'codex-config-warned-once';

interface ICodexI18n {
  notInstalled: string;
  copyCommand: string;
  copied: string;
  copyConfigPath: string;
  configParseFailed: string;
  launchFailed: string;
  resumeFailed: string;
  approvalSendFailed: string;
  approvalNotApplied: string;
  retry: string;
}

const copyAndAck = async (text: string, ackMessage: string) => {
  const ok = await copyToClipboard(text);
  if (ok) {
    toast.success(ackMessage, { duration: 1000 });
  } else {
    toast.error(text, { duration: 4000 });
  }
};

export const notifyCodexNotInstalled = (i18n: ICodexI18n): void => {
  toast.info(i18n.notInstalled, {
    id: 'codex-not-installed',
    duration: 6000,
    action: {
      label: i18n.copyCommand,
      onClick: () => void copyAndAck(CODEX_INSTALL_COMMAND, i18n.copied),
    },
  });
};

export const notifyCodexConfigParseFailed = (i18n: ICodexI18n): void => {
  if (typeof window !== 'undefined' && window.sessionStorage.getItem(CONFIG_DEDUP_KEY)) return;
  if (typeof window !== 'undefined') window.sessionStorage.setItem(CONFIG_DEDUP_KEY, '1');
  toast.info(i18n.configParseFailed, {
    id: 'codex-config-parse-failed',
    duration: 6000,
    action: {
      label: i18n.copyConfigPath,
      onClick: () => void copyAndAck(CODEX_CONFIG_PATH, i18n.copied),
    },
  });
};

export const notifyCodexLaunchFailed = (i18n: ICodexI18n, retry?: () => void): void => {
  toast.error(i18n.launchFailed, {
    id: 'codex-launch-failed',
    duration: 6000,
    action: retry ? { label: i18n.retry, onClick: retry } : undefined,
  });
};

export const notifyCodexResumeFailed = (i18n: ICodexI18n, retry?: () => void): void => {
  toast.error(i18n.resumeFailed, {
    id: 'codex-resume-failed',
    duration: 6000,
    action: retry ? { label: i18n.retry, onClick: retry } : undefined,
  });
};

export const notifyCodexApprovalSendFailed = (i18n: ICodexI18n): void => {
  toast.error(i18n.approvalSendFailed, {
    id: 'codex-approval-send-failed',
    duration: 8000,
  });
};

export const notifyCodexApprovalNotApplied = (i18n: ICodexI18n, retry?: () => void): void => {
  toast.warning(i18n.approvalNotApplied, {
    id: 'codex-approval-not-applied',
    duration: 10000,
    action: retry ? { label: i18n.retry, onClick: retry } : undefined,
  });
};
