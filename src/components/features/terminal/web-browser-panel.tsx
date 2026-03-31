import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Globe } from 'lucide-react';

interface IWebBrowserPanelProps {
  initialUrl?: string | null;
  onUrlChange?: (url: string) => void;
}

const ensureProtocol = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^localhost(:|\/|$)/.test(trimmed) || /^(\d{1,3}\.){3}\d{1,3}(:|\/|$)/.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
};

const WebBrowserPanel = ({ initialUrl, onUrlChange }: IWebBrowserPanelProps) => {
  const [url, setUrl] = useState(initialUrl || '');
  const [addressValue, setAddressValue] = useState(initialUrl || '');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !url) return;
    iframeRef.current.src = url;
  }, [url]);

  const navigate = useCallback((targetUrl: string) => {
    const full = ensureProtocol(targetUrl);
    if (!full) return;
    setUrl(full);
    setAddressValue(full);
    onUrlChange?.(full);
  }, [onUrlChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigate(addressValue);
    }
  };

  const handleGoBack = () => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch { /* cross-origin */ }
  };

  const handleGoForward = () => {
    try {
      iframeRef.current?.contentWindow?.history.forward();
    } catch { /* cross-origin */ }
  };

  const handleRefresh = () => {
    try {
      iframeRef.current?.contentWindow?.location.reload();
    } catch {
      if (iframeRef.current) {
        const currentSrc = iframeRef.current.src;
        iframeRef.current.src = '';
        iframeRef.current.src = currentSrc;
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
        <button
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={handleGoBack}
          aria-label="뒤로"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={handleGoForward}
          aria-label="앞으로"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={handleRefresh}
          aria-label="새로고침"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        <div className="ml-1 flex flex-1 items-center gap-2 rounded-md border border-border bg-secondary px-2.5 py-1">
          <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
            placeholder="URL을 입력하세요"
            value={addressValue}
            onChange={(e) => setAddressValue(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
        </div>
      </div>

      {url ? (
        <iframe
          ref={iframeRef}
          className="min-h-0 flex-1 border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          allow="clipboard-read; clipboard-write"
          title="Web Browser"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Globe className="h-10 w-10 opacity-20" />
            <span className="text-sm">URL을 입력하여 웹페이지를 열어보세요</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebBrowserPanel;
