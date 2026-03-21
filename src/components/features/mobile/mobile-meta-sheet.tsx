import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import { GitBranch } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatTokenCount, formatTokenDetail, formatCost } from '@/lib/format-tokens';

dayjs.extend(relativeTime);
dayjs.locale('ko');

interface IModelTokens {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number | null;
}

interface IMobileMetaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  createdAt: string | null;
  updatedAt: string | null;
  userCount: number;
  assistantCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number | null;
  tokensByModel: IModelTokens[];
  branch: string | null;
  isBranchLoading: boolean;
}

const formatModelName = (model: string): string => {
  const match = model.match(/^claude-(\w+)-[\d.-]+/);
  return match ? match[1] : model;
};

const MobileMetaSheet = ({
  open,
  onOpenChange,
  title,
  createdAt,
  updatedAt,
  userCount,
  assistantCount,
  inputTokens,
  outputTokens,
  totalTokens,
  totalCost,
  tokensByModel,
  branch,
  isBranchLoading,
}: IMobileMetaSheetProps) => {
  const createdRelative = createdAt ? dayjs(createdAt).fromNow() : '';
  const updatedRelative = updatedAt ? dayjs(updatedAt).fromNow() : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-xl">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
        <div className="px-4 pt-4 pb-6">
          <div className="flex flex-col gap-1">
            <span className="max-h-20 overflow-y-auto text-sm font-medium text-foreground">
              {title}
            </span>

            <div className="mt-1 flex flex-col gap-1">
              {isBranchLoading && (
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground/70" />
                  <span className="text-xs text-muted-foreground/50">로드 중...</span>
                </div>
              )}

              {!isBranchLoading && branch && (
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground/70" />
                  <div className="flex items-center gap-1">
                    <GitBranch size={12} className="text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">{branch}</span>
                  </div>
                </div>
              )}

              <div className="flex items-baseline gap-2">
                <span className="w-12 shrink-0 text-xs text-muted-foreground/70">메시지</span>
                <span className="text-xs text-muted-foreground">
                  사용자 {userCount} / 어시스턴트 {assistantCount}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="w-12 shrink-0 text-xs text-muted-foreground/70">토큰</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs text-muted-foreground">
                    입력 {formatTokenDetail(inputTokens)} / 출력 {formatTokenDetail(outputTokens)} / 총{' '}
                    {formatTokenDetail(totalTokens)}
                  </span>
                  {tokensByModel.map((m) => (
                    <span key={m.model} className="font-mono text-xs text-muted-foreground/60">
                      {formatModelName(m.model)}
                      {tokensByModel.length > 1 ? `: ${formatTokenCount(m.totalTokens)}` : ''}
                      {m.cost !== null ? ` (${formatCost(m.cost)})` : ''}
                    </span>
                  ))}
                </div>
              </div>

              {totalCost !== null && (
                <div className="flex items-baseline gap-2">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground/70">비용</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatCost(totalCost)}
                  </span>
                </div>
              )}

              {createdAt && (
                <div className="flex items-baseline gap-2">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground/70">생성</span>
                  <Tooltip>
                    <TooltipTrigger className="text-xs text-muted-foreground">
                      {dayjs(createdAt).format('MM/DD HH:mm')} ({createdRelative})
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {updatedAt && (
                <div className="flex items-baseline gap-2">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground/70">수정</span>
                  <Tooltip>
                    <TooltipTrigger className="text-xs text-muted-foreground">
                      {dayjs(updatedAt).format('MM/DD HH:mm')} ({updatedRelative})
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{dayjs(updatedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMetaSheet;
