import { memo, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import dayjs from 'dayjs';
import { AlertCircle, Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import OpenAIIcon from '@/components/icons/openai-icon';
import { cn } from '@/lib/utils';
import useIsMobile from '@/hooks/use-is-mobile';
import { useCodexSessions } from '@/hooks/use-codex-sessions';
import type { ICodexSessionEntry } from '@/lib/codex-session-list';

interface ICodexSessionListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cwd: string | null;
  onResumeSession: (session: ICodexSessionEntry) => void;
  onNewConversation: () => void;
}

const formatRelativeTime = (
  ms: number,
  tTime: ReturnType<typeof useTranslations>,
): string => {
  const now = dayjs();
  const target = dayjs(ms);
  const diffMinutes = now.diff(target, 'minute');

  if (diffMinutes < 1) return tTime('justNow');
  if (diffMinutes < 60) return tTime('minutesAgo', { count: diffMinutes });

  const diffHours = now.diff(target, 'hour');
  if (diffHours < 24) return tTime('hoursAgo', { count: diffHours });

  const diffDays = now.diff(target, 'day');
  if (diffDays === 1) return tTime('yesterday');
  if (diffDays < 7) return tTime('daysAgo', { count: diffDays });

  const diffWeeks = now.diff(target, 'week');
  if (diffWeeks < 4) return tTime('weeksAgo', { count: diffWeeks });

  const diffMonths = now.diff(target, 'month');
  if (diffMonths < 12) return tTime('monthsAgo', { count: diffMonths });

  return tTime('yearsAgo', { count: now.diff(target, 'year') });
};

const formatTokens = (tokens: number | null): string | null => {
  if (tokens == null || !Number.isFinite(tokens) || tokens <= 0) return null;
  if (tokens < 1000) return `${tokens}`;
  return `${(tokens / 1000).toFixed(1)}k`;
};

const lastSegment = (cwd: string | null): string => {
  if (!cwd) return '~';
  const segments = cwd.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? cwd;
};

interface ICodexSessionItemProps {
  session: ICodexSessionEntry;
  isDisabled: boolean;
  onSelect: (session: ICodexSessionEntry) => void;
  noMessageLabel: string;
  tokensSuffix: string;
  modelLabel: string;
  unknownModelLabel: string;
  tTime: ReturnType<typeof useTranslations>;
}

const CodexSessionItem = memo(({
  session,
  isDisabled,
  onSelect,
  noMessageLabel,
  tokensSuffix,
  modelLabel,
  unknownModelLabel,
  tTime,
}: ICodexSessionItemProps) => {
  const relative = formatRelativeTime(session.startedAt, tTime);
  const cwdShort = lastSegment(session.cwd);
  const tokensFormatted = formatTokens(session.totalTokens);
  const message = session.firstUserMessage?.trim() || noMessageLabel;
  const ariaLabel = [
    message,
    relative,
    cwdShort,
    tokensFormatted ? `${tokensFormatted} ${tokensSuffix}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const tooltipModel = session.model
    ? `${modelLabel}: ${session.model}`
    : `${modelLabel}: ${unknownModelLabel}`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={ariaLabel}
            disabled={isDisabled}
            onClick={() => onSelect(session)}
            className={cn(
              'flex w-full min-h-14 flex-col gap-1 rounded-md px-3 py-2.5 text-left transition-colors',
              'hover:bg-accent focus-visible:bg-accent focus:outline-none',
              isDisabled && 'pointer-events-none opacity-50',
            )}
          />
        }
      >
        <div className="line-clamp-1 truncate text-sm font-medium text-foreground">
          {message}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0">{relative}</span>
          <span aria-hidden>·</span>
          <span className="min-w-0 truncate" title={session.cwd ?? ''}>
            {cwdShort}
          </span>
          {tokensFormatted && (
            <span className="ml-auto shrink-0 font-mono">{tokensFormatted} {tokensSuffix}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <div className="flex flex-col gap-0.5">
          <span>{tooltipModel}</span>
          {session.cwd && <span className="opacity-70">{session.cwd}</span>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

CodexSessionItem.displayName = 'CodexSessionItem';

const SkeletonItem = () => (
  <div className="flex flex-col gap-1.5 rounded-md px-3 py-2.5">
    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
    <div className="flex items-center gap-1.5">
      <div className="h-3 w-12 animate-pulse rounded bg-muted" />
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="h-3 w-10 animate-pulse rounded bg-muted" />
    </div>
  </div>
);

const SkeletonList = () => (
  <div className="flex flex-col gap-1 px-2 py-2">
    <SkeletonItem />
    <SkeletonItem />
    <SkeletonItem />
  </div>
);

interface IEmptyStateProps {
  title: string;
  newConversationLabel: string;
  onNewConversation: () => void;
}

const EmptyState = ({ title, newConversationLabel, onNewConversation }: IEmptyStateProps) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
    <OpenAIIcon size={48} className="text-muted-foreground/50" />
    <p className="text-sm text-muted-foreground">{title}</p>
    <Button autoFocus size="sm" onClick={onNewConversation} className="gap-1.5">
      <Plus className="h-3.5 w-3.5" />
      {newConversationLabel}
    </Button>
  </div>
);

interface IErrorStateProps {
  title: string;
  retryLabel: string;
  onRetry: () => void;
}

const ErrorState = ({ title, retryLabel, onRetry }: IErrorStateProps) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
    <AlertCircle size={32} className="text-ui-red" />
    <p className="text-sm text-muted-foreground">{title}</p>
    <Button autoFocus variant="outline" size="sm" onClick={onRetry}>
      {retryLabel}
    </Button>
  </div>
);

const CodexSessionListSheet = ({
  open,
  onOpenChange,
  cwd,
  onResumeSession,
  onNewConversation,
}: ICodexSessionListSheetProps) => {
  const t = useTranslations('terminal');
  const tSession = useTranslations('session');
  const isMobile = useIsMobile();

  const { sessions, isLoading, error, refresh } = useCodexSessions(cwd, open);

  const handleSelect = useCallback(
    (session: ICodexSessionEntry) => {
      onResumeSession(session);
      onOpenChange(false);
    },
    [onResumeSession, onOpenChange],
  );

  const handleRetry = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleNew = useCallback(() => {
    onNewConversation();
    onOpenChange(false);
  }, [onNewConversation, onOpenChange]);

  const hasSessions = sessions.length > 0;
  const showLoading = isLoading && !hasSessions && !error;
  const showError = !!error && !hasSessions;
  const showEmpty = !showLoading && !showError && !hasSessions;

  const sortedSessions = useMemo(() => sessions, [sessions]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        showCloseButton={!isMobile}
        className={cn(
          isMobile
            ? 'h-[80vh] rounded-t-xl pb-2'
            : 'w-[400px] sm:max-w-[400px]',
          'flex flex-col gap-0 overflow-hidden',
        )}
      >
        {isMobile && (
          <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20" />
        )}
        {!isMobile && <div className="h-titlebar shrink-0" />}
        <SheetHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <OpenAIIcon size={20} className="text-foreground" />
            <SheetTitle className="text-base font-medium">{t('codexSessionList')}</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            {t('codexSessionsSheetSubtitle')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 min-h-0 flex-col">
          {showLoading && <SkeletonList />}
          {showError && (
            <ErrorState
              title={t('codexSessionsLoadFailed')}
              retryLabel={t('codexRetry')}
              onRetry={handleRetry}
            />
          )}
          {showEmpty && (
            <EmptyState
              title={t('codexSessionsEmpty')}
              newConversationLabel={t('codexNewConversation')}
              onNewConversation={handleNew}
            />
          )}
          {!showLoading && !showError && hasSessions && (
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <TooltipProvider delay={100}>
                <div className="flex flex-col gap-0.5">
                  {sortedSessions.map((session) => (
                    <CodexSessionItem
                      key={session.jsonlPath}
                      session={session}
                      isDisabled={false}
                      onSelect={handleSelect}
                      noMessageLabel={tSession('noMessage')}
                      tokensSuffix={t('codexSessionsTokens')}
                      modelLabel={t('codexSessionsModelLabel')}
                      unknownModelLabel={t('codexSessionsUnknownModel')}
                      tTime={tSession}
                    />
                  ))}
                </div>
              </TooltipProvider>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CodexSessionListSheet;
