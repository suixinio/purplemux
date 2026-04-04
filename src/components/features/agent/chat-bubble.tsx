import { AlertCircle, CheckCircle2, HelpCircle, ShieldQuestion } from 'lucide-react';
import dayjs from 'dayjs';
import ApprovalActions from '@/components/features/agent/approval-actions';
import type { IChatMessage } from '@/types/agent';

interface IChatBubbleProps {
  message: IChatMessage;
  isFailed?: boolean;
  onResend?: () => void;
  onApproval?: (action: '승인' | '거부') => void;
}

const agentTypeStyles: Record<string, { icon: React.ReactNode; bg: string }> = {
  report: { icon: null, bg: 'bg-muted' },
  question: {
    icon: <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ui-amber" />,
    bg: 'bg-ui-amber/10 border border-ui-amber/20',
  },
  done: {
    icon: <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive" />,
    bg: 'bg-positive/10 border border-positive/20',
  },
  error: {
    icon: <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-negative" />,
    bg: 'bg-negative/10 border border-negative/20',
  },
  approval: {
    icon: <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ui-purple" />,
    bg: 'bg-ui-purple/10 border border-ui-purple/20',
  },
};

const ChatBubble = ({ message, isFailed, onResend, onApproval }: IChatBubbleProps) => {
  const isUser = message.role === 'user';
  const time = dayjs(message.timestamp).format('HH:mm');
  const isQueued = message.metadata && 'queued' in message.metadata;

  if (isUser) {
    return (
      <div className="flex justify-end" role="article" aria-label={`사용자 메시지, ${time}`}>
        <div className="flex max-w-[80%] flex-col items-end gap-1">
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            <p className="whitespace-pre-wrap">{message.content}</p>
            <div className="mt-1 flex items-center justify-end gap-1">
              {isQueued && (
                <span className="text-[10px] text-primary-foreground/40">큐잉됨</span>
              )}
              <span className="text-[10px] text-primary-foreground/60">{time}</span>
            </div>
          </div>
          {isFailed && (
            <button
              className="flex items-center gap-1 text-xs text-negative"
              onClick={onResend}
            >
              <AlertCircle className="h-3 w-3" />
              재전송
            </button>
          )}
        </div>
      </div>
    );
  }

  const typeStyle = agentTypeStyles[message.type] || agentTypeStyles.report;

  return (
    <div className="flex justify-start" role="article" aria-label={`에이전트 메시지, ${time}`}>
      <div className={`max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm ${typeStyle.bg}`}>
        <div className="flex gap-2">
          {typeStyle.icon}
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.type === 'done' && (
              <span className="mt-1 inline-block rounded bg-positive/20 px-1.5 py-0.5 text-[10px] font-medium text-positive">
                완료
              </span>
            )}
            {message.type === 'approval' && onApproval && (
              <ApprovalActions onAction={onApproval} />
            )}
            <div className="mt-1">
              <span className="text-[10px] text-muted-foreground">{time}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
