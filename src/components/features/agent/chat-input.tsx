import { useState, useCallback, useRef } from 'react';
import { SendHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TAgentStatus } from '@/types/agent';

interface IChatInputProps {
  onSend: (content: string) => void;
  agentStatus: TAgentStatus;
  isSending: boolean;
}

const ChatInput = ({ onSend, agentStatus, isSending }: IChatInputProps) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDisabled = agentStatus === 'working' || agentStatus === 'offline' || isSending;

  const placeholder =
    agentStatus === 'working'
      ? '응답 대기 중...'
      : agentStatus === 'offline'
        ? '에이전트 오프라인'
        : '메시지를 입력하세요...';

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;

    if (debounceRef.current) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
    }, 300);

    onSend(trimmed);
    setValue('');

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    });
  }, [value, isDisabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t px-4 py-3">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            className="w-full resize-none rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            rows={1}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            aria-label="메시지 입력"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          {agentStatus === 'working' && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          variant="default"
          size="icon"
          onClick={handleSubmit}
          disabled={isDisabled || !value.trim()}
          aria-label="메시지 전송"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
