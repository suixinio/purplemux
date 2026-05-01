import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertCircle, ChevronDown, ChevronUp, FileEdit, FilePlus, FileX, ShieldAlert, Terminal } from 'lucide-react';
import Spinner from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useTabStore from '@/hooks/use-tab-store';
import {
  notifyCodexApprovalNotApplied,
  notifyCodexApprovalSendFailed,
} from '@/lib/codex-notifications';
import type {
  IApplyPatchApprovalRequest,
  IExecApprovalRequest,
  IPermissionRequest,
  IRequestPermissions,
  TPatchOperation,
} from '@/types/codex-permission';

interface IPermissionPromptCardProps {
  tabId: string;
  sessionName: string;
  className?: string;
}

const RESPONSE_TIMEOUT_MS = 3000;
const FILE_PREVIEW_LIMIT = 3;

type TResponseKey = 'y' | 'n';

const sendResponseKey = async (sessionName: string, key: TResponseKey): Promise<boolean> => {
  try {
    const res = await fetch('/api/tmux/send-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: sessionName, input: key }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

const useApprovalI18n = () => {
  const t = useTranslations('terminal');
  return {
    notInstalled: t('codexNotInstalled'),
    copyCommand: t('codexCopyCommand'),
    copied: t('codexCopied'),
    copyConfigPath: t('codexCopyConfigPath'),
    configParseFailed: t('codexConfigParseFailed'),
    launchFailed: t('codexLaunchFailed'),
    resumeFailed: t('codexResumeFailed'),
    approvalSendFailed: t('codexApprovalSendFailed'),
    approvalNotApplied: t('codexApprovalNotApplied'),
    retry: t('codexRetry'),
  };
};

const PatchOpIcon = ({ operation }: { operation: TPatchOperation }) => {
  if (operation === 'create') return <FilePlus size={14} className="text-ui-teal" />;
  if (operation === 'delete') return <FileX size={14} className="text-ui-red" />;
  return <FileEdit size={14} className="text-ui-blue" />;
};

const ExecBody = ({
  request,
  expanded,
  t,
}: {
  request: IExecApprovalRequest;
  expanded: boolean;
  t: ReturnType<typeof useTranslations>;
}) => (
  <div className="flex flex-col gap-2">
    <p className="text-sm text-foreground">{t('codexPermissionExecMessage')}</p>
    <pre className="overflow-x-auto rounded-md border border-border/40 bg-muted/40 px-3 py-2 font-mono text-sm text-foreground">
      <span className="select-none text-muted-foreground">$ </span>
      {request.command}
    </pre>
    {request.cwd && (
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">{t('codexPermissionCwd')}: </span>
        <span className="font-mono">{request.cwd}</span>
      </p>
    )}
    {expanded && request.env && Object.keys(request.env).length > 0 && (
      <div className="flex flex-col gap-1 rounded-md border border-border/30 bg-muted/30 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{t('codexPermissionEnv')}</p>
        <div className="max-h-32 overflow-y-auto font-mono text-xs text-foreground">
          {Object.entries(request.env).map(([k, v]) => (
            <div key={k} className="truncate">
              <span className="text-muted-foreground">{k}=</span>
              {v}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const PatchBody = ({
  request,
  expanded,
  t,
}: {
  request: IApplyPatchApprovalRequest;
  expanded: boolean;
  t: ReturnType<typeof useTranslations>;
}) => {
  const visiblePatches = expanded ? request.patches : request.patches.slice(0, FILE_PREVIEW_LIMIT);
  const hiddenCount = request.patches.length - visiblePatches.length;
  const opLabel = (op: TPatchOperation) => {
    if (op === 'create') return t('codexPermissionPatchOpCreate');
    if (op === 'delete') return t('codexPermissionPatchOpDelete');
    return t('codexPermissionPatchOpModify');
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-foreground">{t('codexPermissionPatchMessage')}</p>
      <ul className="flex flex-col gap-1">
        {visiblePatches.map((patch, idx) => (
          <li
            key={`${patch.path}-${idx}`}
            className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/40 px-3 py-1.5 font-mono text-xs"
          >
            <PatchOpIcon operation={patch.operation} />
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
              {opLabel(patch.operation)}
            </span>
            <span className="truncate text-foreground">{patch.path}</span>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="text-xs text-muted-foreground">
            {t('codexPermissionFilesMore', { count: hiddenCount })}
          </li>
        )}
      </ul>
      {expanded && request.patches.some((p) => p.diff) && (
        <div className="flex flex-col gap-1.5">
          {request.patches
            .filter((p) => p.diff)
            .map((patch, idx) => (
              <pre
                key={`diff-${patch.path}-${idx}`}
                className="max-h-60 overflow-auto rounded-md border border-border/30 bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed text-foreground"
              >
                <span className="text-muted-foreground">--- {patch.path}</span>
                {'\n'}
                {patch.diff}
              </pre>
            ))}
        </div>
      )}
    </div>
  );
};

const PermissionsBody = ({
  request,
  t,
}: {
  request: IRequestPermissions;
  t: ReturnType<typeof useTranslations>;
}) => (
  <div className="flex flex-col gap-2">
    <p className="text-sm text-foreground">{t('codexPermissionPermissionsMessage')}</p>
    <ul className="flex flex-wrap gap-1.5">
      {request.permissions.map((perm) => (
        <li
          key={perm}
          className="rounded-md border border-border/40 bg-muted/40 px-2.5 py-1 font-mono text-xs text-foreground"
        >
          {perm}
        </li>
      ))}
    </ul>
  </div>
);

const HeaderIcon = ({ kind }: { kind: IPermissionRequest['type'] }) => {
  if (kind === 'ExecApprovalRequest') {
    return <Terminal size={16} className="text-ui-blue" aria-hidden />;
  }
  if (kind === 'ApplyPatchApprovalRequest') {
    return <FileEdit size={16} className="text-ui-blue" aria-hidden />;
  }
  return <ShieldAlert size={16} className="text-ui-blue" aria-hidden />;
};

const HeaderBadgeKey: Record<IPermissionRequest['type'], string> = {
  ExecApprovalRequest: 'codexPermissionExecBadge',
  ApplyPatchApprovalRequest: 'codexPermissionPatchBadge',
  RequestPermissions: 'codexPermissionPermissionsBadge',
};

const PermissionPromptCard = ({ tabId, sessionName, className }: IPermissionPromptCardProps) => {
  const t = useTranslations('terminal');
  const i18n = useApprovalI18n();
  const cliState = useTabStore((s) => s.tabs[tabId]?.cliState);
  const permissionRequest = useTabStore((s) => s.tabs[tabId]?.permissionRequest ?? null);
  const lastEventSeq = useTabStore((s) => s.tabs[tabId]?.lastEvent?.seq);

  const [isSending, setIsSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [introPulse, setIntroPulse] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const sendResponseRef = useRef<(key: TResponseKey) => Promise<void>>(async () => {});
  const pendingKeyRef = useRef<TResponseKey | null>(null);

  const isVisible = cliState === 'needs-input';

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPendingTimeout(), [clearPendingTimeout]);

  useEffect(() => {
    if (!isVisible) {
      clearPendingTimeout();
      const pending = pendingKeyRef.current;
      if (pending) {
        const messageKey = pending === 'y' ? 'codexApprovalGranted' : 'codexApprovalDenied';
        toast.success(t(messageKey), { duration: 1500 });
        pendingKeyRef.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 카드 unmount 동기화
      setIsSending(false);
      setShowDetails(false);
    }
  }, [isVisible, clearPendingTimeout, t]);

  useEffect(() => {
    if (!isVisible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 새 권한 요청 도착 시 깜박임 트리거
    setIntroPulse(true);
    const id = window.setTimeout(() => setIntroPulse(false), 900);
    return () => window.clearTimeout(id);
  }, [isVisible, lastEventSeq]);

  const sendResponse = useCallback(
    async (key: TResponseKey) => {
      if (!isVisible || isSending) return;
      setIsSending(true);
      const ok = await sendResponseKey(sessionName, key);
      if (!ok) {
        setIsSending(false);
        notifyCodexApprovalSendFailed(i18n);
        return;
      }
      pendingKeyRef.current = key;
      clearPendingTimeout();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const stillNeedsInput = useTabStore.getState().tabs[tabId]?.cliState === 'needs-input';
        if (stillNeedsInput) {
          pendingKeyRef.current = null;
          notifyCodexApprovalNotApplied(i18n, () => {
            void sendResponseRef.current(key);
          });
        }
        setIsSending(false);
      }, RESPONSE_TIMEOUT_MS);
    },
    [isVisible, isSending, sessionName, i18n, clearPendingTimeout, tabId],
  );

  useEffect(() => {
    sendResponseRef.current = sendResponse;
  }, [sendResponse]);

  useEffect(() => {
    if (!isVisible) return;
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
        if (isEditable) return;
      }
      const card = cardRef.current;
      if (!card) return;
      const focusInside = card.contains(document.activeElement);
      const focusOnBody = document.activeElement === document.body || document.activeElement === null;
      if (!focusInside && !focusOnBody) return;
      if (event.key === 'y' || event.key === 'Y') {
        event.preventDefault();
        void sendResponse('y');
      } else if (event.key === 'n' || event.key === 'N' || event.key === 'Escape') {
        event.preventDefault();
        void sendResponse('n');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isVisible, sendResponse]);

  if (!isVisible) return null;

  const hasRequest = permissionRequest !== null;
  const requestKind = permissionRequest?.type ?? 'RequestPermissions';
  const badgeLabel = t(HeaderBadgeKey[requestKind]);

  return (
    <div
      ref={cardRef}
      role="alertdialog"
      aria-modal="false"
      aria-label={t('codexPermissionTitle')}
      className={cn(
        'flex w-full flex-col gap-3 border-l-4 border-l-ui-blue bg-card px-4 py-3',
        introPulse && 'animate-pulse motion-reduce:animate-none',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {permissionRequest ? (
          <HeaderIcon kind={permissionRequest.type} />
        ) : (
          <AlertCircle size={16} className="text-ui-blue" aria-hidden />
        )}
        <span aria-live="assertive" className="text-sm font-semibold text-foreground">
          {t('codexPermissionTitle')}
        </span>
        <span className="rounded-md border border-border/40 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {badgeLabel}
        </span>
      </div>

      {hasRequest && permissionRequest.type === 'ExecApprovalRequest' && (
        <ExecBody request={permissionRequest} expanded={showDetails} t={t} />
      )}
      {hasRequest && permissionRequest.type === 'ApplyPatchApprovalRequest' && (
        <PatchBody request={permissionRequest} expanded={showDetails} t={t} />
      )}
      {hasRequest && permissionRequest.type === 'RequestPermissions' && (
        <PermissionsBody request={permissionRequest} t={t} />
      )}
      {!hasRequest && (
        <p className="text-sm text-muted-foreground">{t('codexPermissionNoDetails')}</p>
      )}

      {hasRequest && (permissionRequest.type === 'ExecApprovalRequest' || permissionRequest.type === 'ApplyPatchApprovalRequest') && (
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="inline-flex items-center gap-1 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span>{showDetails ? t('codexPermissionHideDetails') : t('codexPermissionShowDetails')}</span>
        </button>
      )}

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          onClick={() => void sendResponse('y')}
          disabled={isSending}
          className="min-h-11 flex-1 gap-2"
        >
          {isSending ? (
            <>
              <Spinner size={14} />
              <span>{t('codexPermissionSendingResponse')}</span>
            </>
          ) : (
            <>
              <span>{t('codexPermissionYes')}</span>
              <kbd className="rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 text-[10px] font-medium">
                Y
              </kbd>
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void sendResponse('n')}
          disabled={isSending}
          className="min-h-11 flex-1 gap-2"
        >
          {isSending ? (
            <>
              <Spinner size={14} />
              <span>{t('codexPermissionSendingResponse')}</span>
            </>
          ) : (
            <>
              <span>{t('codexPermissionNo')}</span>
              <kbd className="rounded border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium">
                N
              </kbd>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PermissionPromptCard;
