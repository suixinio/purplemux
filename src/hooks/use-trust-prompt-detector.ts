import { useCallback, useEffect, useRef, useState } from 'react';
import { matchTrustPrompt, type ITrustPromptInfo, type TTrustAnswer } from '@/lib/trust-prompt-detector';

const DEBOUNCE_MS = 200;

interface IUseTrustPromptDetectorOptions {
  enabled: boolean;
  getBufferText: () => string;
  sendStdin: (data: string) => void;
}

interface IUseTrustPromptDetectorReturn {
  trustPrompt: ITrustPromptInfo | null;
  onTerminalData: () => void;
  onTrustResponse: (answer: TTrustAnswer) => void;
}

const useTrustPromptDetector = ({
  enabled,
  getBufferText,
  sendStdin,
}: IUseTrustPromptDetectorOptions): IUseTrustPromptDetectorReturn => {
  const [trustPrompt, setTrustPrompt] = useState<ITrustPromptInfo | null>(null);
  const enabledRef = useRef(enabled);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getBufferTextRef = useRef(getBufferText);

  useEffect(() => {
    getBufferTextRef.current = getBufferText;
  }, [getBufferText]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled && debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [enabled]);

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const effectiveTrustPrompt = enabled ? trustPrompt : null;

  const onTerminalData = useCallback(() => {
    if (!enabledRef.current || debounceRef.current) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (!enabledRef.current) return;
      const matched = matchTrustPrompt(getBufferTextRef.current());
      setTrustPrompt((prev) => {
        const prevPath = prev?.folderPath ?? null;
        const nextPath = matched?.folderPath ?? null;
        return prevPath === nextPath ? prev : matched;
      });
    }, DEBOUNCE_MS);
  }, []);

  const onTrustResponse = useCallback((answer: TTrustAnswer) => {
    setTrustPrompt(null);
    sendStdin(answer === 'yes' ? '1\r' : '2\r');
  }, [sendStdin]);

  return { trustPrompt: effectiveTrustPrompt, onTerminalData, onTrustResponse };
};

export default useTrustPromptDetector;
