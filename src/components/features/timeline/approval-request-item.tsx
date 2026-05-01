import { memo } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ITimelineApprovalRequest, TApprovalKind, TToolStatus } from '@/types/timeline';

interface IApprovalRequestItemProps {
  entry: ITimelineApprovalRequest;
}

const KIND_LABEL: Record<TApprovalKind, string> = {
  'exec': 'Exec',
  'apply-patch': 'ApplyPatch',
  'permissions': 'Permissions',
};

const STATUS_COLOR: Record<TToolStatus, string> = {
  pending: 'text-ui-amber',
  success: 'text-ui-teal',
  error: 'text-negative',
};

const statusLabel = (status: TToolStatus): { text: string; Icon: typeof Check | null; tone: string } => {
  if (status === 'success') return { text: '승인됨', Icon: Check, tone: 'text-ui-teal' };
  if (status === 'error') return { text: '거부됨', Icon: X, tone: 'text-negative' };
  return { text: '대기 중', Icon: null, tone: 'text-ui-amber' };
};

const ApprovalRequestItem = ({ entry }: IApprovalRequestItemProps) => {
  const kindLabel = KIND_LABEL[entry.approvalKind];
  const statusColor = STATUS_COLOR[entry.status];
  const statusPulse = entry.status === 'pending' ? 'animate-pulse' : '';
  const result = statusLabel(entry.status);
  const ResultIcon = result.Icon;

  return (
    <div className="animate-in fade-in py-1 duration-150" role="article">
      <div className="rounded-md border border-ui-blue/30 bg-ui-blue/5 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <AlertCircle size={14} className={cn('shrink-0', statusColor, statusPulse)} />
          <span className="text-xs font-medium text-foreground/90">권한 요청</span>
          <span className="text-xs text-muted-foreground">({kindLabel})</span>
        </div>
        {entry.command && (
          <div className="mt-1.5 ml-0.5 break-all font-mono text-xs text-foreground/90">
            <span className="text-muted-foreground">$ </span>
            {entry.command}
          </div>
        )}
        {entry.cwd && (
          <div className="mt-0.5 ml-0.5 break-all font-mono text-[11px] text-muted-foreground/70">
            cwd: {entry.cwd}
          </div>
        )}
        {entry.patches && entry.patches.length > 0 && (
          <div className="mt-1.5 ml-0.5 space-y-0.5">
            {entry.patches.map((p, idx) => (
              <div key={`${p.path}-${idx}`} className="break-all font-mono text-[11px]">
                <span className="text-foreground/90">{p.path}</span>
                {p.status && (
                  <span className="ml-1.5 text-muted-foreground/60">({p.status})</span>
                )}
              </div>
            ))}
          </div>
        )}
        {entry.permissions && entry.permissions.length > 0 && (
          <div className="mt-1.5 ml-0.5 flex flex-wrap gap-1">
            {entry.permissions.map((perm, idx) => (
              <span
                key={`${perm}-${idx}`}
                className="rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {perm}
              </span>
            ))}
          </div>
        )}
        <div className={cn('mt-2 flex items-center gap-1 text-xs', result.tone)}>
          <span className="text-muted-foreground">결과:</span>
          {ResultIcon && <ResultIcon size={12} />}
          <span>{result.text}</span>
        </div>
      </div>
    </div>
  );
};

export default memo(ApprovalRequestItem);
