import { useState, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import type { TCliState } from '@/types/timeline';

type TWebInputMode = 'input' | 'interrupt' | 'disabled';

const RESTART_COMMANDS = new Set(['/new', '/clear']);

interface IUseWebInputReturn {
  value: string;
  setValue: (v: string) => void;
  mode: TWebInputMode;
  send: () => void;
  interrupt: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  focusInput: () => void;
}

interface IUseWebInputOptions {
  onRestartSession?: () => void;
}

const useWebInput = (
  cliState: TCliState,
  sendStdin: (data: string) => void,
  terminalWsConnected: boolean,
  options?: IUseWebInputOptions,
): IUseWebInputReturn => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mode: TWebInputMode = useMemo(() => {
    if (cliState === 'idle') return 'input';
    if (cliState === 'busy') return 'interrupt';
    return 'disabled';
  }, [cliState]);

  const onRestartSession = options?.onRestartSession;

  const send = useCallback(() => {
    if (mode === 'disabled') {
      toast.error('Claude Code가 실행 중이 아닙니다');
      return;
    }

    if (!terminalWsConnected) {
      toast.error('터미널 연결이 끊어졌습니다');
      return;
    }

    if (value.trim() === '') return;

    if (RESTART_COMMANDS.has(value.trim().toLowerCase())) {
      onRestartSession?.();
      setValue('');
      return;
    }

    if (mode === 'interrupt') {
      sendStdin('\x1b\x1b');
      setTimeout(() => {
        sendStdin(value + '\r');
      }, 100);
    } else {
      sendStdin(value + '\r');
    }
    setValue('');
  }, [mode, value, sendStdin, terminalWsConnected, onRestartSession]);

  const interrupt = useCallback(() => {
    if (!terminalWsConnected) {
      toast.error('터미널 연결이 끊어졌습니다');
      return;
    }
    sendStdin('\x1b\x1b');
  }, [sendStdin, terminalWsConnected]);

  const focusInput = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const [prevMode, setPrevMode] = useState(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    if (mode === 'disabled') {
      setValue('');
    }
  }

  return {
    value,
    setValue,
    mode,
    send,
    interrupt,
    textareaRef,
    focusInput,
  };
};

export default useWebInput;
export type { TWebInputMode };
