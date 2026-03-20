import { cn } from '@/lib/utils';
import useTimeline from '@/hooks/use-timeline';
import TimelineView from '@/components/features/timeline/timeline-view';

interface IClaudeCodePanelProps {
  sessionName: string;
  className?: string;
}

const ClaudeCodePanel = ({ sessionName, className }: IClaudeCodePanelProps) => {
  const {
    entries,
    sessionStatus,
    wsStatus,
    isAutoScrollEnabled,
    setAutoScrollEnabled,
    isLoading,
    isSessionTransitioning,
    error,
    loadMore,
    hasMore,
    retrySession,
  } = useTimeline({
    sessionName,
    enabled: !!sessionName,
  });

  return (
    <div className={cn('h-full w-full', className)}>
      <TimelineView
        entries={entries}
        sessionStatus={sessionStatus}
        wsStatus={wsStatus}
        isLoading={isLoading}
        isSessionTransitioning={isSessionTransitioning}
        error={error}
        isAutoScrollEnabled={isAutoScrollEnabled}
        onAutoScrollChange={setAutoScrollEnabled}
        onRetry={retrySession}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
    </div>
  );
};

export default ClaudeCodePanel;
