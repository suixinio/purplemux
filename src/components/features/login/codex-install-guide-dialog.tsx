import { useTranslations } from 'next-intl';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import OpenAIIcon from '@/components/icons/openai-icon';
import { copyToClipboard } from '@/lib/clipboard';

interface ICodexInstallGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CODEX_DOCS_URL = 'https://github.com/openai/codex';

const CodexInstallGuideDialog = ({ open, onOpenChange }: ICodexInstallGuideDialogProps) => {
  const t = useTranslations('toolsRequired');
  const tt = useTranslations('terminal');
  const tc = useTranslations('common');

  const handleCopy = async (cmd: string) => {
    const ok = await copyToClipboard(cmd);
    if (ok) toast.success(tt('codexCopied'), { duration: 1000 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <OpenAIIcon className="h-4 w-4" />
            {t('codexInstallGuideTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {[t('codexInstallNpm'), t('codexInstallBrew')].map((cmd) => (
            <div
              key={cmd}
              className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs"
            >
              <span className="flex-1 truncate">{cmd}</span>
              <button
                type="button"
                onClick={() => void handleCopy(cmd)}
                aria-label={tt('codexCopyCommand')}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <a
            href={CODEX_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {CODEX_DOCS_URL.replace('https://', '')}
          </a>
          <Button onClick={() => onOpenChange(false)}>{tc('close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CodexInstallGuideDialog;
