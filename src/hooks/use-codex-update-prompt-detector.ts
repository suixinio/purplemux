import { useCallback, useEffect, useRef, useState } from 'react';
import {
  matchCodexUpdatePrompt,
  type ICodexUpdatePromptInfo,
  type TCodexUpdateAnswer,
} from '@/lib/codex-update-prompt-detector';

const DEBOUNCE_MS = 200;
const RELAUNCH_DELAY_MS = 700;

interface IUseCodexUpdatePromptDetectorOptions {
  enabled: boolean;
  scopeKey?: string | null;
  getBufferText: () => string;
  sendStdin: (data: string) => void;
  onUpdated?: () => void;
}

interface IUseCodexUpdatePromptDetectorReturn {
  updatePrompt: ICodexUpdatePromptInfo | null;
  onTerminalData: () => void;
  onRespond: (answer: TCodexUpdateAnswer) => void;
}

const useCodexUpdatePromptDetector = ({
  enabled,
  scopeKey,
  getBufferText,
  sendStdin,
  onUpdated,
}: IUseCodexUpdatePromptDetectorOptions): IUseCodexUpdatePromptDetectorReturn => {
  const [updatePromptState, setUpdatePromptState] = useState<{ scopeKey: string | null; prompt: ICodexUpdatePromptInfo | null }>({
    scopeKey: null,
    prompt: null,
  });
  const enabledRef = useRef(false);
  const scopeKeyRef = useRef(scopeKey ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const relaunchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledSuccessRef = useRef(false);
  const getBufferTextRef = useRef(getBufferText);
  const onUpdatedRef = useRef(onUpdated);

  useEffect(() => {
    getBufferTextRef.current = getBufferText;
  }, [getBufferText]);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  useEffect(() => {
    scopeKeyRef.current = scopeKey ?? null;
  }, [scopeKey]);

  const onTerminalData = useCallback(() => {
    if (!enabledRef.current || debounceRef.current) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (!enabledRef.current) return;

      const matched = matchCodexUpdatePrompt(getBufferTextRef.current());
      const currentScopeKey = scopeKeyRef.current;
      setUpdatePromptState((prevState) => {
        const prev = prevState.scopeKey === currentScopeKey ? prevState.prompt : null;
        if (!matched) {
          return prev?.status === 'prompt'
            ? prevState
            : { scopeKey: currentScopeKey, prompt: null };
        }
        if (matched.status === 'success' && !handledSuccessRef.current) {
          handledSuccessRef.current = true;
          relaunchTimerRef.current = setTimeout(() => {
            relaunchTimerRef.current = null;
            onUpdatedRef.current?.();
          }, RELAUNCH_DELAY_MS);
        }
        if (
          prev
          && prev.status === matched.status
          && prev.currentVersion === matched.currentVersion
          && prev.latestVersion === matched.latestVersion
          && prev.updateCommand === matched.updateCommand
        ) {
          return prevState;
        }
        return { scopeKey: currentScopeKey, prompt: matched };
      });
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const wasEnabled = enabledRef.current;
    enabledRef.current = enabled;
    if (!enabled) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      handledSuccessRef.current = false;
      return;
    }
    if (!wasEnabled) {
      onTerminalData();
    }
  }, [enabled, onTerminalData]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (relaunchTimerRef.current) clearTimeout(relaunchTimerRef.current);
  }, []);

  const onRespond = useCallback((answer: TCodexUpdateAnswer) => {
    if (answer === 'update') {
      setUpdatePromptState((prev) => prev.prompt ? { ...prev, prompt: { ...prev.prompt, status: 'updating' } } : prev);
      sendStdin('1\r');
      return;
    }
    setUpdatePromptState({ scopeKey: scopeKeyRef.current, prompt: null });
    sendStdin(answer === 'skip' ? '2\r' : '3\r');
  }, [sendStdin]);

  const visiblePrompt = updatePromptState.scopeKey === (scopeKey ?? null) ? updatePromptState.prompt : null;
  return { updatePrompt: enabled ? visiblePrompt : null, onTerminalData, onRespond };
};

export default useCodexUpdatePromptDetector;
