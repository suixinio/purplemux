import { useState } from 'react';
import { Terminal, GitCompareArrows } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Spinner from '@/components/ui/spinner';
import ClaudeCodeIcon from '@/components/icons/claude-code-icon';
import OpenAIIcon from '@/components/icons/openai-icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CodexSessionListSheet from '@/components/features/workspace/codex-session-list-sheet';
import useWorkspaceStore from '@/hooks/use-workspace-store';
import { notifyCodexResumeFailed } from '@/lib/codex-notifications';
import type { ICodexSessionEntry } from '@/lib/codex-session-list';
import type { TPanelType } from '@/types/terminal';

interface IMobileNewTabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTab: (panelType?: TPanelType, options?: { command?: string; resumeSessionId?: string }) => Promise<void>;
}

const MobileNewTabDialog = ({ open, onOpenChange, onCreateTab }: IMobileNewTabDialogProps) => {
  const tt = useTranslations('terminal');
  const tm = useTranslations('mobile');
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [codexSheetOpen, setCodexSheetOpen] = useState(false);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceCwd = useWorkspaceStore((s) =>
    activeWorkspaceId ? s.workspaces.find((w) => w.id === activeWorkspaceId)?.directories[0] ?? null : null,
  );

  const codexI18n = {
    notInstalled: tt('codexNotInstalled'),
    copyCommand: tt('codexCopyCommand'),
    copied: tt('codexCopied'),
    copyConfigPath: tt('codexCopyConfigPath'),
    configParseFailed: tt('codexConfigParseFailed'),
    launchFailed: tt('codexLaunchFailed'),
    resumeFailed: tt('codexResumeFailed'),
    approvalSendFailed: tt('codexApprovalSendFailed'),
    approvalNotApplied: tt('codexApprovalNotApplied'),
    retry: tt('codexRetry'),
  };

  const MENU_ITEMS = [
    { key: 'claude-new', type: 'claude-code' as const, icon: <ClaudeCodeIcon className="h-5 w-5" />, label: tt('claudeNewConversation'), startAgent: 'claude' as const },
    { key: 'claude', type: 'claude-code' as const, icon: <ClaudeCodeIcon className="h-5 w-5" />, label: tt('claudeSessionList') },
    { key: 'codex-new', type: 'codex-cli' as const, icon: <OpenAIIcon className="h-5 w-5" />, label: tt('codexNewConversation'), startAgent: 'codex' as const },
    { key: 'codex', type: 'codex-cli' as const, icon: <OpenAIIcon className="h-5 w-5" />, label: tt('codexSessionList') },
    { key: 'terminal', type: 'terminal' as const, icon: <Terminal className="h-5 w-5 text-muted-foreground" />, label: 'Terminal' },
    { key: 'diff', type: 'diff' as const, icon: <GitCompareArrows className="h-5 w-5 text-muted-foreground" />, label: 'Diff' },
  ] as const;

  const handleNewCodexConversation = async () => {
    await onCreateTab('codex-cli', { command: 'codex-new' });
  };

  const handleResumeCodexSession = async (session: ICodexSessionEntry) => {
    try {
      await onCreateTab('codex-cli', { resumeSessionId: session.sessionId });
    } catch {
      notifyCodexResumeFailed(codexI18n, () => void handleResumeCodexSession(session));
    }
  };

  const handleSelect = async (item: (typeof MENU_ITEMS)[number]) => {
    if (item.key === 'codex') {
      onOpenChange(false);
      setCodexSheetOpen(true);
      return;
    }
    setCreatingKey(item.key);
    if ('startAgent' in item && item.startAgent === 'claude') {
      await onCreateTab(item.type, { command: 'claude-new' });
    } else if ('startAgent' in item && item.startAgent === 'codex') {
      await onCreateTab(item.type, { command: 'codex-new' });
    } else {
      await onCreateTab(item.type);
    }
    setCreatingKey(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xs gap-2 rounded-xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">{tm('newTab')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.key}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background text-foreground transition-colors active:bg-accent disabled:pointer-events-none disabled:opacity-50"
                disabled={creatingKey !== null}
                onClick={() => handleSelect(item)}
              >
                {creatingKey === item.key ? <Spinner className="h-4 w-4" /> : item.icon}
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <CodexSessionListSheet
        open={codexSheetOpen}
        onOpenChange={setCodexSheetOpen}
        cwd={workspaceCwd}
        onResumeSession={(s) => void handleResumeCodexSession(s)}
        onNewConversation={() => void handleNewCodexConversation()}
      />
    </>
  );
};

export default MobileNewTabDialog;
