import { useState } from 'react';
import dayjs from 'dayjs';
import {
  FileText,
  FilePen,
  FilePlus,
  Terminal,
  Search,
  Wrench,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ITimelineToolCall, TToolName } from '@/types/timeline';

interface IToolCallItemProps {
  entry: ITimelineToolCall;
}

const TOOL_ICONS: Record<string, typeof FileText> = {
  Read: FileText,
  Edit: FilePen,
  Write: FilePlus,
  Bash: Terminal,
  Grep: Search,
  Glob: Search,
  Agent: Users,
};

const renderToolIcon = (toolName: TToolName, size: number) => {
  const IconComponent = TOOL_ICONS[toolName] ?? Wrench;
  return <IconComponent size={size} />;
};

const DiffView = ({ oldString, newString }: { oldString: string; newString: string }) => {
  const oldLines = oldString.split('\n');
  const newLines = newString.split('\n');

  return (
    <div className="mt-2 overflow-x-auto rounded border bg-background font-mono text-xs">
      {oldLines.map((line, i) => (
        <div key={`old-${i}`} className="bg-ui-red/10 px-3 py-0.5">
          <span className="mr-2 text-ui-red select-none">-</span>
          <span>{line}</span>
        </div>
      ))}
      {newLines.map((line, i) => (
        <div key={`new-${i}`} className="bg-ui-teal/10 px-3 py-0.5">
          <span className="mr-2 text-ui-teal select-none">+</span>
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
};

const ToolCallItem = ({ entry }: IToolCallItemProps) => {
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const hasDiff = entry.diff && (entry.diff.oldString || entry.diff.newString);

  const statusColor = {
    pending: 'text-ui-amber',
    success: 'text-positive',
    error: 'text-negative',
  }[entry.status];

  const statusPulse = entry.status === 'pending' ? 'animate-pulse' : '';

  return (
    <div className="animate-in fade-in duration-150">
      <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-[10px] text-muted-foreground/60">{dayjs(entry.timestamp).format('HH:mm')}</span>
          <span className={cn('shrink-0', statusColor, statusPulse)}>
            {renderToolIcon(entry.toolName, 12)}
          </span>
          <span className="text-xs font-mono truncate">{entry.summary}</span>
        </div>
        {hasDiff && (
          <Button
            variant="ghost"
            size="xs"
            className="mt-1 h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => setIsDiffOpen((prev) => !prev)}
          >
            {isDiffOpen ? '▾ diff 숨기기' : '▸ diff 보기'}
          </Button>
        )}
        {isDiffOpen && entry.diff && (
          <DiffView oldString={entry.diff.oldString} newString={entry.diff.newString} />
        )}
      </div>
    </div>
  );
};

export default ToolCallItem;
