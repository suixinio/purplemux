import { useState, useEffect, useCallback, useReducer } from 'react';
import { useRouter } from 'next/router';
import type { TPeriod, IOverviewResponse, IProjectsResponse, ISessionsResponse, IFacetsResponse, IHistoryResponse, IUptimeResponse, IAggregatedStatsResponse } from '@/types/stats';

interface IStatsState {
  overview: IOverviewResponse | null;
  allOverview: IOverviewResponse | null;
  projects: IProjectsResponse | null;
  sessions: ISessionsResponse | null;
  facets: IFacetsResponse | null;
  history: IHistoryResponse | null;
  uptime: IUptimeResponse | null;
  aggregated: IAggregatedStatsResponse | null;
  overviewLoading: boolean;
  allOverviewLoading: boolean;
  projectsLoading: boolean;
  sessionsLoading: boolean;
  facetsLoading: boolean;
  historyLoading: boolean;
  uptimeLoading: boolean;
  aggregatedLoading: boolean;
  overviewError: string | null;
  allOverviewError: string | null;
  projectsError: string | null;
  sessionsError: string | null;
  facetsError: string | null;
  historyError: string | null;
  uptimeError: string | null;
  aggregatedError: string | null;
}

type TStatsAction =
  | { type: 'FETCH_START' }
  | { type: 'OVERVIEW_OK'; data: IOverviewResponse }
  | { type: 'OVERVIEW_ERR'; error: string }
  | { type: 'ALL_OVERVIEW_OK'; data: IOverviewResponse }
  | { type: 'ALL_OVERVIEW_ERR'; error: string }
  | { type: 'PROJECTS_OK'; data: IProjectsResponse }
  | { type: 'PROJECTS_ERR'; error: string }
  | { type: 'SESSIONS_OK'; data: ISessionsResponse }
  | { type: 'SESSIONS_ERR'; error: string }
  | { type: 'FACETS_OK'; data: IFacetsResponse }
  | { type: 'FACETS_ERR'; error: string }
  | { type: 'HISTORY_OK'; data: IHistoryResponse }
  | { type: 'HISTORY_ERR'; error: string }
  | { type: 'UPTIME_OK'; data: IUptimeResponse }
  | { type: 'UPTIME_ERR'; error: string }
  | { type: 'AGGREGATED_OK'; data: IAggregatedStatsResponse }
  | { type: 'AGGREGATED_ERR'; error: string };

const initialState: IStatsState = {
  overview: null,
  allOverview: null,
  projects: null,
  sessions: null,
  facets: null,
  history: null,
  uptime: null,
  aggregated: null,
  overviewLoading: true,
  allOverviewLoading: true,
  projectsLoading: true,
  sessionsLoading: true,
  facetsLoading: true,
  historyLoading: true,
  uptimeLoading: true,
  aggregatedLoading: true,
  overviewError: null,
  allOverviewError: null,
  projectsError: null,
  sessionsError: null,
  facetsError: null,
  historyError: null,
  uptimeError: null,
  aggregatedError: null,
};

const reducer = (state: IStatsState, action: TStatsAction): IStatsState => {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        overviewLoading: true,
        allOverviewLoading: true,
        projectsLoading: true,
        sessionsLoading: true,
        facetsLoading: true,
        historyLoading: true,
        uptimeLoading: true,
        aggregatedLoading: true,
        overviewError: null,
        allOverviewError: null,
        projectsError: null,
        sessionsError: null,
        facetsError: null,
        historyError: null,
        uptimeError: null,
        aggregatedError: null,
      };
    case 'OVERVIEW_OK':
      return { ...state, overview: action.data, overviewLoading: false };
    case 'OVERVIEW_ERR':
      return { ...state, overviewError: action.error, overviewLoading: false };
    case 'ALL_OVERVIEW_OK':
      return { ...state, allOverview: action.data, allOverviewLoading: false };
    case 'ALL_OVERVIEW_ERR':
      return { ...state, allOverviewError: action.error, allOverviewLoading: false };
    case 'PROJECTS_OK':
      return { ...state, projects: action.data, projectsLoading: false };
    case 'PROJECTS_ERR':
      return { ...state, projectsError: action.error, projectsLoading: false };
    case 'SESSIONS_OK':
      return { ...state, sessions: action.data, sessionsLoading: false };
    case 'SESSIONS_ERR':
      return { ...state, sessionsError: action.error, sessionsLoading: false };
    case 'FACETS_OK':
      return { ...state, facets: action.data, facetsLoading: false };
    case 'FACETS_ERR':
      return { ...state, facetsError: action.error, facetsLoading: false };
    case 'HISTORY_OK':
      return { ...state, history: action.data, historyLoading: false };
    case 'HISTORY_ERR':
      return { ...state, historyError: action.error, historyLoading: false };
    case 'UPTIME_OK':
      return { ...state, uptime: action.data, uptimeLoading: false };
    case 'UPTIME_ERR':
      return { ...state, uptimeError: action.error, uptimeLoading: false };
    case 'AGGREGATED_OK':
      return { ...state, aggregated: action.data, aggregatedLoading: false };
    case 'AGGREGATED_ERR':
      return { ...state, aggregatedError: action.error, aggregatedLoading: false };
  }
};

interface IUseStatsReturn extends IStatsState {
  period: TPeriod;
  setPeriod: (p: TPeriod) => void;
  refetch: () => void;
  initializing: boolean;
  fileCount: number;
}

const fetchJson = async <T>(url: string, signal: AbortSignal): Promise<T> => {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json() as Promise<T>;
};

const VALID_PERIODS: TPeriod[] = ['today', '7d', '30d', 'all'];
const DEFAULT_PERIOD: TPeriod = '7d';

const parsePeriodParam = (value: unknown): TPeriod => {
  if (typeof value === 'string' && VALID_PERIODS.includes(value as TPeriod)) return value as TPeriod;
  return DEFAULT_PERIOD;
};

const useStats = (): IUseStatsReturn => {
  const router = useRouter();
  const [period, setPeriodState] = useState<TPeriod>(() => parsePeriodParam(router.query.period));
  const [state, dispatch] = useReducer(reducer, initialState);
  const [fetchKey, setFetchKey] = useState(0);
  const [initializing, setInitializing] = useState(false);
  const [fileCount, setFileCount] = useState(0);

  const [prevRouterPeriod, setPrevRouterPeriod] = useState<string | undefined>(undefined);
  const routerPeriodRaw = router.isReady ? String(router.query.period ?? '') : undefined;
  if (routerPeriodRaw !== undefined && routerPeriodRaw !== prevRouterPeriod) {
    setPrevRouterPeriod(routerPeriodRaw);
    setPeriodState(parsePeriodParam(router.query.period));
  }

  const setPeriod = useCallback((p: TPeriod) => {
    setPeriodState(p);
    router.replace({ pathname: router.pathname, query: { period: p } }, undefined, { shallow: true });
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const q = `?period=${period}`;

    dispatch({ type: 'FETCH_START' });

    fetch('/api/stats/cache-status', { signal })
      .then((r) => r.json() as Promise<{ exists: boolean; fileCount: number }>)
      .then((d) => { if (!signal.aborted) { setInitializing(!d.exists); setFileCount(d.fileCount); } })
      .catch(() => {});

    fetchJson<IOverviewResponse>(`/api/stats/overview${q}`, signal)
      .then((data) => {
        setInitializing(false);
        dispatch({ type: 'OVERVIEW_OK', data });
        if (period === 'all') dispatch({ type: 'ALL_OVERVIEW_OK', data });
      })
      .catch((e) => { if (!signal.aborted) { setInitializing(false); dispatch({ type: 'OVERVIEW_ERR', error: e.message }); } });

    if (period !== 'all') {
      fetchJson<IOverviewResponse>('/api/stats/overview?period=all', signal)
        .then((data) => dispatch({ type: 'ALL_OVERVIEW_OK', data }))
        .catch((e) => { if (!signal.aborted) dispatch({ type: 'ALL_OVERVIEW_ERR', error: e.message }); });
    }

    fetchJson<IProjectsResponse>(`/api/stats/projects${q}`, signal)
      .then((data) => dispatch({ type: 'PROJECTS_OK', data }))
      .catch((e) => { if (!signal.aborted) dispatch({ type: 'PROJECTS_ERR', error: e.message }); });

    fetchJson<ISessionsResponse>(`/api/stats/sessions${q}`, signal)
      .then((data) => dispatch({ type: 'SESSIONS_OK', data }))
      .catch((e) => { if (!signal.aborted) dispatch({ type: 'SESSIONS_ERR', error: e.message }); });

    fetchJson<IFacetsResponse>(`/api/stats/facets${q}`, signal)
      .then((data) => dispatch({ type: 'FACETS_OK', data }))
      .catch((e) => { if (!signal.aborted) dispatch({ type: 'FACETS_ERR', error: e.message }); });

    fetchJson<IHistoryResponse>(`/api/stats/history${q}&limit=10`, signal)
      .then((data) => dispatch({ type: 'HISTORY_OK', data }))
      .catch((e) => { if (!signal.aborted) dispatch({ type: 'HISTORY_ERR', error: e.message }); });

    fetchJson<IUptimeResponse>('/api/stats/uptime', signal)
      .then((data) => dispatch({ type: 'UPTIME_OK', data }))
      .catch((e) => { if (!signal.aborted) dispatch({ type: 'UPTIME_ERR', error: e.message }); });

    fetchJson<IAggregatedStatsResponse>(`/api/stats/aggregated${q}`, signal)
      .then((data) => dispatch({ type: 'AGGREGATED_OK', data }))
      .catch((e) => { if (!signal.aborted) dispatch({ type: 'AGGREGATED_ERR', error: e.message }); });

    return () => controller.abort();
  }, [period, fetchKey]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return {
    period,
    setPeriod,
    ...state,
    refetch,
    initializing,
    fileCount,
  };
};

export default useStats;
