import { useState } from 'react';
import { ClipboardList, Eye, Terminal, TerminalSquare, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ITimelinePlan } from '@/types/timeline';

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeHighlight];

interface IPlanItemProps {
  entry: ITimelinePlan;
}

const PlanItem = ({ entry }: IPlanItemProps) => {
  const [open, setOpen] = useState(false);
  const firstLine = entry.markdown.split('\n').find((l) => l.replace(/^#+\s*/, '').trim()) ?? 'Plan';
  const title = firstLine.replace(/^#+\s*/, '').trim();
  const prompts = entry.allowedPrompts;
  const isPending = entry.status === 'pending';
  const isApproved = entry.status === 'success';

  return (
    <div className="animate-in fade-in duration-150">
      {isPending && prompts && prompts.length > 0 ? (
        <div className="rounded-lg border border-ui-purple/20 bg-ui-purple/5 px-4 py-3">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-medium text-ui-purple">
            <ClipboardList size={14} />
            <span>플랜 승인 대기</span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Eye size={12} />
              <span>상세</span>
            </button>
          </div>

          <p className="mb-3 text-sm">{title}</p>

          <div className="flex flex-col gap-1.5">
            {prompts.map((p, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Terminal size={12} className="shrink-0 text-ui-purple/70" />
                    <span className="truncate">{p.prompt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TerminalSquare size={12} />
            <span>터미널에서 승인하세요</span>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/50"
          >
            <ClipboardList size={14} className="shrink-0 text-ui-purple" />
            <span className="shrink-0 font-semibold uppercase text-ui-purple">Plan</span>
            <span className="flex-1 truncate">{title}</span>
            {isApproved && <Check size={12} className="shrink-0 text-ui-purple/60" />}
            <Eye size={12} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
          </button>

          {prompts && prompts.length > 0 && (
            <div className="mt-1 ml-6 flex flex-col gap-1">
              {prompts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-md border border-border/30 px-3 py-1.5 text-xs text-muted-foreground opacity-60"
                >
                  <Terminal size={12} className="shrink-0 text-ui-purple/70" />
                  <span className="truncate">{p.prompt}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">Plan 상세 내용</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_pre]:overflow-x-auto [&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-3 [&_pre_code]:text-foreground [&_code]:text-[0.9em] [&_code.hljs]:text-[1em] [&_code]:font-normal [&_code]:font-mono [&_code::before]:content-none [&_code::after]:content-none">
              <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
                {entry.markdown}
              </ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanItem;
