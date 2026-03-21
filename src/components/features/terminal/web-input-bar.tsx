import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { SendHorizontal, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import useWebInput from '@/hooks/use-web-input';
import InterruptDialog from '@/components/features/terminal/interrupt-dialog';
import type { TCliState } from '@/types/timeline';

const MAX_ROWS = 5;
const LINE_HEIGHT = 20;
const PADDING_Y = 16;

interface IWebInputBarProps {
  cliState: TCliState;
  sendStdin: (data: string) => void;
  terminalWsConnected: boolean;
  visible: boolean;
  focusTerminal: () => void;
  focusInputRef: React.MutableRefObject<(() => void) | undefined>;
}

const WebInputBar = ({
  cliState,
  sendStdin,
  terminalWsConnected,
  visible,
  focusTerminal,
  focusInputRef,
}: IWebInputBarProps) => {
  const { value, setValue, mode, send, interrupt, textareaRef, focusInput } = useWebInput(
    cliState,
    sendStdin,
    terminalWsConnected,
  );

  const [interruptDialogOpen, setInterruptDialogOpen] = useState(false);

  useEffect(() => {
    focusInputRef.current = focusInput;
    return () => {
      focusInputRef.current = undefined;
    };
  }, [focusInput, focusInputRef]);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = LINE_HEIGHT * MAX_ROWS + PADDING_Y;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [textareaRef]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      textareaRef.current?.blur();
      focusTerminal();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
      return;
    }
  };

  const handleSendClick = () => {
    send();
    textareaRef.current?.focus();
  };

  const handleInterruptClick = () => {
    setInterruptDialogOpen(true);
  };

  const handleInterruptConfirm = () => {
    interrupt();
  };

  const isDisabled = mode !== 'input';
  const hasValue = value.trim().length > 0;

  return (
    <>
      <div
        className={cn(
          'overflow-hidden transition-[height] duration-150 ease-out',
          !visible && 'h-0',
        )}
      >
        <div
          className={cn(
            'relative z-10 flex items-end gap-2 border-t px-3 py-2 bg-background',
            mode === 'disabled' && 'opacity-50',
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            placeholder={
              mode === 'interrupt'
                ? 'Claude가 응답 중...'
                : mode === 'disabled'
                  ? 'Claude Code가 실행 중이 아닙니다'
                  : '메시지를 입력하세요...'
            }
            aria-label="Claude Code 메시지 입력"
            className={cn(
              'flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground',
              isDisabled && 'cursor-not-allowed opacity-70',
            )}
            rows={1}
            style={{
              lineHeight: `${LINE_HEIGHT}px`,
              maxHeight: `${LINE_HEIGHT * MAX_ROWS + PADDING_Y}px`,
              overflowY: 'auto',
            }}
          />

          {mode === 'interrupt' ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0 text-ui-red hover:text-ui-red/80"
              onClick={handleInterruptClick}
              aria-label="작업 중단"
            >
              <Square size={14} fill="currentColor" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground',
                hasValue && mode === 'input' && 'text-ui-purple',
              )}
              onClick={handleSendClick}
              disabled={mode === 'disabled'}
              aria-label="메시지 전송"
            >
              <SendHorizontal size={16} />
            </Button>
          )}
        </div>
      </div>

      <InterruptDialog
        open={interruptDialogOpen}
        onOpenChange={setInterruptDialogOpen}
        onConfirm={handleInterruptConfirm}
      />
    </>
  );
};

export default WebInputBar;
