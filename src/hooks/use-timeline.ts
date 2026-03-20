import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ITimelineEntry,
  ISessionInfo,
  TSessionStatus,
  TTimelineConnectionStatus,
} from '@/types/timeline';
import useTimelineWebSocket from '@/hooks/use-timeline-websocket';

interface IUseTimelineOptions {
  sessionName: string;
  workspaceId: string;
  enabled: boolean;
}

interface IUseTimelineReturn {
  entries: ITimelineEntry[];
  sessionStatus: TSessionStatus;
  wsStatus: TTimelineConnectionStatus;
  isAutoScrollEnabled: boolean;
  setAutoScrollEnabled: (enabled: boolean) => void;
  isLoading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  retrySession: () => void;
}

const useTimeline = ({
  sessionName,
  workspaceId,
  enabled,
}: IUseTimelineOptions): IUseTimelineReturn => {
  const [entries, setEntries] = useState<ITimelineEntry[]>([]);
  const [sessionStatus, setSessionStatus] = useState<TSessionStatus>('none');
  const [isAutoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  });

  const jsonlPathRef = useRef<string | null>(null);
  const totalEntriesRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const fetchSession = useCallback(async () => {
    if (!enabled || !workspaceId) return;
    try {
      const res = await fetch(
        `/api/timeline/session?workspace=${encodeURIComponent(workspaceId)}`,
      );
      if (!res.ok) throw new Error('세션 정보를 불러올 수 없습니다');
      const info: ISessionInfo = await res.json();
      setSessionStatus(info.status);
      jsonlPathRef.current = info.jsonlPath;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '세션 정보를 불러올 수 없습니다');
      setSessionStatus('none');
    }
  }, [enabled, workspaceId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleInit = useCallback((newEntries: ITimelineEntry[], totalEntries: number) => {
    setEntries(newEntries);
    totalEntriesRef.current = totalEntries;
    setHasMore(newEntries.length < totalEntries);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleAppend = useCallback((newEntries: ITimelineEntry[]) => {
    setEntries((prev) => {
      const updated = [...prev];
      for (const entry of newEntries) {
        if (entry.type === 'tool-result') {
          const idx = updated.findIndex(
            (e) => e.type === 'tool-call' && e.toolUseId === entry.toolUseId,
          );
          if (idx !== -1) {
            const tc = updated[idx] as ITimelineEntry & { type: 'tool-call'; status: string };
            updated[idx] = { ...tc, status: entry.isError ? 'error' : 'success' };
          }
        }
        updated.push(entry);
      }
      return updated;
    });
  }, []);

  const handleSessionChanged = useCallback((_newSessionId: string) => {
    setEntries([]);
    setHasMore(false);
    setIsLoading(true);
    setAutoScrollEnabled(true);
  }, []);

  const loadMore = useCallback(async () => {
    if (!jsonlPathRef.current || isLoadingMoreRef.current || !hasMore) return;
    isLoadingMoreRef.current = true;
    try {
      const currentCount = entriesRef.current.length;
      const offset = Math.max(0, totalEntriesRef.current - currentCount - 200);
      const limit = Math.min(200, totalEntriesRef.current - currentCount);
      if (limit <= 0) {
        setHasMore(false);
        return;
      }
      const res = await fetch(
        `/api/timeline/entries?jsonlPath=${encodeURIComponent(jsonlPathRef.current)}&offset=${offset}&limit=${limit}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setEntries((prev) => [...(data.entries as ITimelineEntry[]), ...prev]);
      setHasMore(offset > 0);
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [hasMore]);

  const handleError = useCallback((err: { code: string; message: string }) => {
    console.warn(`[timeline] WebSocket error: ${err.code} — ${err.message}`);
  }, []);

  const shouldConnect = enabled && (sessionStatus === 'active' || sessionStatus === 'inactive');

  const { status: wsStatus } = useTimelineWebSocket({
    sessionName,
    workspaceId,
    enabled: shouldConnect,
    onInit: handleInit,
    onAppend: handleAppend,
    onSessionChanged: handleSessionChanged,
    onError: handleError,
  });

  return {
    entries,
    sessionStatus,
    wsStatus,
    isAutoScrollEnabled,
    setAutoScrollEnabled,
    isLoading,
    error,
    loadMore,
    hasMore,
    retrySession: fetchSession,
  };
};

export default useTimeline;
