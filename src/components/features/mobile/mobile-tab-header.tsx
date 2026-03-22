import { X, Plus, BotMessageSquare, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { TPanelType } from '@/types/terminal';

interface IMobileTabHeaderProps {
  tabName: string;
  panelType: TPanelType;
  onToggleClaude: () => void;
  onCreateTab: () => void;
  onClose: () => void;
}

const MobileTabHeader = ({
  tabName,
  panelType,
  onToggleClaude,
  onCreateTab,
  onClose,
}: IMobileTabHeaderProps) => {
  const isClaudeCode = panelType === 'claude-code';

  return (
    <div className="flex h-10 shrink-0 items-center border-b border-border/50 bg-background">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
        {isClaudeCode ? (
          <BotMessageSquare size={14} className="shrink-0 text-ui-purple" />
        ) : (
          <Terminal size={14} className="shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-xs text-foreground">{tabName}</span>
      </div>

      <div className="flex shrink-0 items-center">
        <button
          className={cn(
            'flex h-10 items-center px-3 text-xs font-medium transition-colors',
            isClaudeCode
              ? 'text-ui-purple'
              : 'text-muted-foreground',
          )}
          onClick={onToggleClaude}
        >
          CLAUDE
        </button>

        <button
          className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors"
          onClick={onCreateTab}
          aria-label="새 탭"
        >
          <Plus size={16} />
        </button>

        <AlertDialog>
          <AlertDialogTrigger
            className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors"
            aria-label="탭 닫기"
          >
            <X size={16} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>탭 닫기</AlertDialogTitle>
              <AlertDialogDescription>
                &apos;{tabName}&apos; 탭을 닫으시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                className="bg-ui-red hover:bg-ui-red/80"
                onClick={onClose}
              >
                닫기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default MobileTabHeader;
