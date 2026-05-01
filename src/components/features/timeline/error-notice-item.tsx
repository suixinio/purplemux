import { memo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Shield, WifiOff, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ITimelineErrorNotice, TErrorSeverity } from '@/types/timeline';

interface IErrorNoticeItemProps {
  entry: ITimelineErrorNotice;
}

const SEVERITY_CONFIG: Record<TErrorSeverity, {
  Icon: typeof XCircle;
  label: string;
  containerClass: string;
  iconClass: string;
  labelClass: string;
}> = {
  'error': {
    Icon: XCircle,
    label: 'Error',
    containerClass: 'border-negative/40 bg-negative/5',
    iconClass: 'text-negative',
    labelClass: 'text-negative',
  },
  'warning': {
    Icon: AlertTriangle,
    label: 'Warning',
    containerClass: 'border-ui-amber/40 bg-ui-amber/5',
    iconClass: 'text-ui-amber',
    labelClass: 'text-ui-amber',
  },
  'stream-error': {
    Icon: WifiOff,
    label: 'Stream error',
    containerClass: 'border-ui-amber/40 bg-ui-amber/5',
    iconClass: 'text-ui-amber',
    labelClass: 'text-ui-amber',
  },
  'guardian-warning': {
    Icon: Shield,
    label: 'Guardian',
    containerClass: 'border-ui-purple/40 bg-ui-purple/5',
    iconClass: 'text-ui-purple',
    labelClass: 'text-ui-purple',
  },
};

const PREVIEW_LIMIT = 200;

const ErrorNoticeItem = ({ entry }: IErrorNoticeItemProps) => {
  const config = SEVERITY_CONFIG[entry.severity];
  const Icon = config.Icon;
  const message = entry.message ?? '';
  const isLong = message.length > PREVIEW_LIMIT || message.includes('\n');
  const [isExpanded, setIsExpanded] = useState(false);
  const preview = isLong && !isExpanded ? message.slice(0, PREVIEW_LIMIT) + '…' : message;

  return (
    <div className="animate-in fade-in py-1 duration-150" role="alert">
      <div className={cn('rounded-md border px-3 py-2', config.containerClass)}>
        <div className="flex items-start gap-1.5">
          <Icon size={14} className={cn('mt-0.5 shrink-0', config.iconClass)} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-medium', config.labelClass)}>{config.label}</span>
              {entry.severity === 'stream-error' && entry.retryStatus && (
                <span className="rounded-sm bg-ui-amber/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ui-amber">
                  {entry.retryStatus}
                </span>
              )}
              {entry.errorCode && (
                <span className="rounded-sm bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {entry.errorCode}
                </span>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-foreground/90">
              {preview}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                aria-expanded={isExpanded}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <span>{isExpanded ? '접기' : '자세히 보기'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ErrorNoticeItem);
