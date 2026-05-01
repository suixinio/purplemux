import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, FileEdit, FilePlus, FileX, FilePen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ITimelinePatchApply, IPatchApplyFile, TToolStatus } from '@/types/timeline';

interface IPatchApplyItemProps {
  entry: ITimelinePatchApply;
}

const STATUS_COLOR: Record<TToolStatus, string> = {
  pending: 'text-ui-amber',
  success: 'text-ui-teal',
  error: 'text-negative',
};

const renderFileIcon = (status?: string) => {
  const s = (status ?? '').toLowerCase();
  const className = 'shrink-0 text-muted-foreground/70';
  if (s.includes('add') || s.includes('create')) return <FilePlus size={11} className={className} />;
  if (s.includes('delete') || s.includes('remove')) return <FileX size={11} className={className} />;
  if (s.includes('update') || s.includes('modify')) return <FilePen size={11} className={className} />;
  return <FileEdit size={11} className={className} />;
};

const fileLabelFor = (status?: string): string => {
  const s = (status ?? '').toLowerCase();
  if (s.includes('add') || s.includes('create')) return 'create';
  if (s.includes('delete') || s.includes('remove')) return 'delete';
  if (s.includes('update') || s.includes('modify')) return 'modify';
  return s || '';
};

const PatchFileRow = ({ file }: { file: IPatchApplyFile }) => {
  const label = fileLabelFor(file.status);
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {renderFileIcon(file.status)}
      <span className="font-mono break-all text-foreground/90">{file.path}</span>
      {label && (
        <span className="shrink-0 text-muted-foreground/60">({label})</span>
      )}
    </div>
  );
};

const PatchApplyItem = ({ entry }: IPatchApplyItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const statusColor = STATUS_COLOR[entry.status];
  const statusPulse = entry.status === 'pending' ? 'animate-pulse' : '';
  const fileCount = entry.files.length;
  const success = entry.success !== false;

  return (
    <div className="animate-in fade-in py-1 duration-150" role="article">
      <div className="flex items-start gap-1.5">
        <FileEdit size={12} className={cn('mt-0.5 shrink-0', statusColor, statusPulse)} />
        <div className="min-w-0 flex-1">
          <div className="text-xs">
            <span className="font-medium text-foreground/90">Patch</span>
            <span className="ml-1.5 text-muted-foreground">
              {fileCount > 0 ? `${fileCount}개 파일 수정` : '파일 정보 없음'}
            </span>
            <span className="ml-1.5 text-muted-foreground/60">·</span>
            <span className={cn('ml-1.5', success ? 'text-muted-foreground' : 'text-negative')}>
              {entry.status === 'pending' ? '진행 중' : success ? '성공' : '실패'}
            </span>
          </div>
          {fileCount > 0 && (
            <div className="mt-1 ml-0.5 space-y-0.5">
              {entry.files.map((f, idx) => (
                <PatchFileRow key={`${f.path}-${idx}`} file={f} />
              ))}
            </div>
          )}
          {entry.diff && (
            <>
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-expanded={isOpen}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <span>{isOpen ? 'Diff 숨기기' : 'Diff 보기'}</span>
              </button>
              {isOpen && (
                <div className="mt-1.5 max-h-[400px] overflow-auto rounded border border-border/40 bg-muted/40 p-2 font-mono text-[11px]">
                  <pre className="whitespace-pre-wrap break-words text-foreground/90">
                    {entry.diff}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(PatchApplyItem);
