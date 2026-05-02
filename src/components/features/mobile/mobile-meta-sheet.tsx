import { Sheet, SheetContent } from '@/components/ui/sheet';
import { MetaDetail } from '@/components/features/workspace/session-meta-content';
import type { ITmuxInfo } from '@/components/features/workspace/session-meta-content';
import type { IGitStatus } from '@/lib/git-status';
import type { ISessionMetaData } from '@/hooks/use-session-meta';

interface IMobileMetaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: ISessionMetaData;
  toolCount: number | null;
  toolBreakdown: Record<string, number> | null;
  branch: string | null;
  isBranchLoading: boolean;
  sessionId: string | null;
  gitStatus: IGitStatus | null;
  tmuxInfo?: ITmuxInfo | null;
}

const MobileMetaSheet = ({
  open,
  onOpenChange,
  meta,
  toolCount,
  toolBreakdown,
  branch,
  isBranchLoading,
  sessionId,
  gitStatus,
  tmuxInfo,
}: IMobileMetaSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" showCloseButton={false} className="rounded-t-xl">
      <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
      <div className="px-4 pt-4 pb-6">
        <MetaDetail
          title={meta.title}
          sessionId={sessionId}
          createdAt={meta.createdAt}
          updatedAt={meta.updatedAt}
          fileSize={meta.fileSize}
          userCount={meta.userCount}
          assistantCount={meta.assistantCount}
          toolCount={toolCount}
          toolBreakdown={toolBreakdown}
          inputTokens={meta.inputTokens}
          cachedInputTokens={meta.cachedInputTokens}
          outputTokens={meta.outputTokens}
          reasoningOutputTokens={meta.reasoningOutputTokens}
          totalCost={meta.totalCost}
          currentContextTokens={meta.currentContextTokens}
          contextWindowSize={meta.contextWindowSize}
          usedPercentage={meta.usedPercentage}
          model={meta.model}
          branch={branch}
          isBranchLoading={isBranchLoading}
          gitStatus={gitStatus}
          tmuxInfo={tmuxInfo}
        />
      </div>
    </SheetContent>
  </Sheet>
);

export default MobileMetaSheet;
