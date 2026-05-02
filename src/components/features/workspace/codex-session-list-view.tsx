import { memo, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import dayjs from 'dayjs';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import OpenAIIcon from '@/components/icons/openai-icon';
import { cn } from '@/lib/utils';
import type { ICodexSessionEntry } from '@/lib/codex-session-list';

interface ICodexSessionListViewProps {
  sessions: ICodexSessionEntry[];
  isLoading: boolean;
  error: string | null;
  resumingSessionId: string | null;
  onSelectSession: (session: ICodexSessionEntry) => void;
  onRefresh: () => Promise<void>;
  onNewSession?: () => void;
  className?: string;
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
  isResuming: boolean;
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
  isResuming,
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
              'flex w-full min-h-14 flex-col gap-1 border-b border-border/50 px-4 py-3 text-left transition-colors',
              'hover:bg-claude-active/5 focus-visible:bg-claude-active/5 focus:outline-none',
              isResuming && 'bg-claude-active/5',
              isDisabled && !isResuming && 'pointer-events-none opacity-50',
            )}
          />
        }
      >
        <div className="flex items-center gap-1.5">
          {isResuming ? (
            <Loader2 size={14} className="shrink-0 animate-spin text-claude-active" />
          ) : (
            <span className="inline-block h-1.5 w-1.5 shrink-0" />
          )}
          <span className="line-clamp-1 min-w-0 truncate text-sm font-medium text-foreground">
            {message}
          </span>
        </div>
        <div className="flex items-center gap-1.5 pl-[20px] text-xs text-muted-foreground">
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

const SessionListSkeleton = () => (
  <div className="flex flex-col">
    {[1, 2, 3].map((i) => (
      <div key={i} className="border-b border-border/50 px-4 py-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 flex items-center gap-2 pl-[20px]">
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-3 w-10 animate-pulse rounded bg-muted" />
        </div>
      </div>
    ))}
  </div>
);

const CodexSessionListView = ({
  sessions,
  isLoading,
  error,
  resumingSessionId,
  onSelectSession,
  onRefresh,
  onNewSession,
  className,
}: ICodexSessionListViewProps) => {
  const t = useTranslations('terminal');
  const tSession = useTranslations('session');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    await onRefresh();
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [onRefresh]);

  const isResumeInProgress = !!resumingSessionId;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">
          {t('codexSessionList')}
          {sessions.length > 0 && `(${sessions.length})`}
        </span>
        {onNewSession && (
          <Button variant="outline" size="sm" onClick={onNewSession}>
            <Plus size={12} />
            {t('newConversation')}
          </Button>
        )}
      </div>

      {isLoading && sessions.length === 0 ? (
        <SessionListSkeleton />
      ) : error ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
          <AlertCircle size={24} className="text-ui-red" />
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            {t('codexRetry')}
          </Button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <OpenAIIcon size={40} className="text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t('codexSessionsEmpty')}</p>
          {onNewSession && (
            <Button size="sm" onClick={onNewSession}>
              <Plus className="h-3.5 w-3.5" />
              {t('codexNewConversation')}
            </Button>
          )}
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <TooltipProvider delay={100}>
            {sessions.map((session) => (
              <CodexSessionItem
                key={session.jsonlPath}
                session={session}
                isResuming={session.sessionId === resumingSessionId}
                isDisabled={isResumeInProgress}
                onSelect={onSelectSession}
                noMessageLabel={tSession('noMessage')}
                tokensSuffix={t('codexSessionsTokens')}
                modelLabel={t('codexSessionsModelLabel')}
                unknownModelLabel={t('codexSessionsUnknownModel')}
                tTime={tSession}
              />
            ))}
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

export default CodexSessionListView;
