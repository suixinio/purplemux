import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import InstallDialog from '@/components/features/login/install-dialog';
import CodexInstallGuideDialog from '@/components/features/login/codex-install-guide-dialog';
import type { IRuntimePreflightResult } from '@/types/preflight';

export type TAgentInstallProvider = 'claude' | 'codex';

interface IInstallTarget {
  command: string;
  label: string;
}

const isInstalled = (status: IRuntimePreflightResult, provider: TAgentInstallProvider): boolean =>
  provider === 'codex' ? status.codex.installed : status.claude.installed;

const fetchRuntimePreflight = async (): Promise<IRuntimePreflightResult | null> => {
  try {
    const res = await fetch('/api/preflight/runtime', { method: 'POST' });
    if (!res.ok) return null;
    return await res.json() as IRuntimePreflightResult;
  } catch {
    return null;
  }
};

export const useAgentInstallCheck = () => {
  const t = useTranslations('toolsRequired');
  const [installTarget, setInstallTarget] = useState<IInstallTarget | null>(null);
  const [codexGuideOpen, setCodexGuideOpen] = useState(false);

  const ensureAgentInstalled = useCallback(async (provider: TAgentInstallProvider): Promise<boolean> => {
    const status = await fetchRuntimePreflight();
    if (!status || isInstalled(status, provider)) return true;

    if (provider === 'codex') {
      setCodexGuideOpen(true);
      return false;
    }

    setInstallTarget({ command: 'claude', label: t('installClaude') });
    return false;
  }, [t]);

  const installDialogs = (
    <>
      {installTarget && (
        <InstallDialog
          open
          onOpenChange={() => setInstallTarget(null)}
          command={installTarget.command}
          label={installTarget.label}
        />
      )}
      <CodexInstallGuideDialog open={codexGuideOpen} onOpenChange={setCodexGuideOpen} />
    </>
  );

  return { ensureAgentInstalled, installDialogs };
};
