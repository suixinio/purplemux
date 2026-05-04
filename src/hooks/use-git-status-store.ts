import { create } from 'zustand';
import type { IGitStatus } from '@/lib/git-status';

type TGitStatusPhase = 'idle' | 'loading' | 'ready' | 'not-git' | 'error';

interface IGitStatusTarget {
  cwdKey: string | null;
  tmuxSession: string | null;
}

interface IGitStatusState extends IGitStatusTarget {
  phase: TGitStatusPhase;
  status: IGitStatus | null;
  branch: string | null;
  error: string | null;
  lastFetchedAt: number | null;
  requestSeq: number;
  resetForTarget: (target: IGitStatusTarget) => void;
  fetchForTarget: (target: IGitStatusTarget, opts?: { force?: boolean }) => Promise<void>;
}

type TGitStatusIndicatorTone = 'dirty' | 'sync' | 'stash';

interface IGitStatusIndicator {
  key: string;
  label: string;
  tone: TGitStatusIndicatorTone;
}

const FETCH_TTL_MS = 15_000;

const emptyTargetState = {
  phase: 'idle' as TGitStatusPhase,
  status: null,
  branch: null,
  error: null,
  lastFetchedAt: null,
};

export const getGitChangedCount = (status: IGitStatus | null) =>
  status ? status.staged + status.modified + status.untracked : 0;

export const getGitStatusIndicators = (status: IGitStatus | null): IGitStatusIndicator[] => {
  if (!status) return [];
  const changed = getGitChangedCount(status);
  const indicators: IGitStatusIndicator[] = [];

  if (changed > 0) {
    indicators.push({
      key: 'changed',
      label: changed > 99 ? '99+' : String(changed),
      tone: 'dirty',
    });
  }
  if (status.ahead > 0) {
    indicators.push({
      key: 'ahead',
      label: `↑${status.ahead}`,
      tone: 'sync',
    });
  }
  if (status.behind > 0) {
    indicators.push({
      key: 'behind',
      label: `↓${status.behind}`,
      tone: 'sync',
    });
  }
  if (status.stash > 0) {
    indicators.push({
      key: 'stash',
      label: `S${status.stash}`,
      tone: 'stash',
    });
  }

  return indicators;
};

export const formatGitStatusSummary = (
  phase: TGitStatusPhase,
  branch: string | null,
  status: IGitStatus | null,
  fallback: string,
) => {
  if (phase === 'idle') return fallback;
  if (phase === 'loading') return 'Checking Git status...';
  if (phase === 'not-git') return 'Not a Git repository';
  if (phase === 'error') return 'Git status unavailable';
  if (!status) return fallback;

  const changed = getGitChangedCount(status);
  const parts = [
    branch ?? 'Git',
    changed > 0 ? `${changed} changed` : 'clean',
  ];

  if (status.insertions > 0 || status.deletions > 0) {
    parts.push(`+${status.insertions} -${status.deletions}`);
  }
  if (status.ahead > 0) parts.push(`ahead ${status.ahead}`);
  if (status.behind > 0) parts.push(`behind ${status.behind}`);
  if (status.stash > 0) parts.push(`${status.stash} stash`);

  return parts.join(' · ');
};

const useGitStatusStore = create<IGitStatusState>((set, get) => ({
  cwdKey: null,
  tmuxSession: null,
  ...emptyTargetState,
  requestSeq: 0,

  resetForTarget: ({ cwdKey, tmuxSession }) => {
    set((state) => {
      if (state.cwdKey === cwdKey) {
        if (state.tmuxSession === tmuxSession) return state;
        return { tmuxSession };
      }
      return {
        ...emptyTargetState,
        cwdKey,
        tmuxSession,
        requestSeq: state.requestSeq + 1,
      };
    });
  },

  fetchForTarget: async ({ cwdKey, tmuxSession }, opts) => {
    if (!cwdKey || !tmuxSession) {
      get().resetForTarget({ cwdKey: null, tmuxSession: null });
      return;
    }

    const current = get();
    const targetChanged = current.cwdKey !== cwdKey;
    const fresh = current.lastFetchedAt !== null && Date.now() - current.lastFetchedAt < FETCH_TTL_MS;
    if (!targetChanged && !opts?.force && fresh && current.phase !== 'error') {
      if (current.tmuxSession !== tmuxSession) set({ tmuxSession });
      return;
    }

    const requestSeq = current.requestSeq + 1;
    set({
      cwdKey,
      tmuxSession,
      phase: 'loading',
      status: targetChanged ? null : current.status,
      branch: targetChanged ? null : current.branch,
      error: null,
      lastFetchedAt: null,
      requestSeq,
    });

    try {
      const statusRes = await fetch(`/api/git/status?tmuxSession=${encodeURIComponent(tmuxSession)}`, {
        cache: 'no-store',
      });

      if (!statusRes.ok) {
        throw new Error(`status-${statusRes.status}`);
      }

      const statusData = await statusRes.json() as { status: IGitStatus | null };
      if (get().requestSeq !== requestSeq) return;

      if (!statusData.status) {
        set({
          phase: 'not-git',
          status: null,
          branch: null,
          error: null,
          lastFetchedAt: Date.now(),
        });
        return;
      }

      let branch: string | null = null;
      try {
        const branchRes = await fetch(`/api/git/branch?tmuxSession=${encodeURIComponent(tmuxSession)}`, {
          cache: 'no-store',
        });
        if (branchRes.ok) {
          const branchData = await branchRes.json() as { branch: string | null };
          branch = branchData.branch;
        }
      } catch {
        branch = null;
      }

      if (get().requestSeq !== requestSeq) return;
      set({
        phase: 'ready',
        status: statusData.status,
        branch,
        error: null,
        lastFetchedAt: Date.now(),
      });
    } catch (err) {
      if (get().requestSeq !== requestSeq) return;
      set({
        phase: 'error',
        status: null,
        branch: null,
        error: err instanceof Error ? err.message : String(err),
        lastFetchedAt: Date.now(),
      });
    }
  },
}));

export type { TGitStatusIndicatorTone, TGitStatusPhase };
export default useGitStatusStore;
