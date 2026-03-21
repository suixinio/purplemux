import { useState, useEffect, useRef, useCallback } from 'react';

const POLL_INTERVAL_MS = 30_000;

interface IUseGitBranchReturn {
  branch: string | null;
  isLoading: boolean;
}

const useGitBranch = (tmuxSession: string): IUseGitBranchReturn => {
  const [branch, setBranch] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBranch = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/git/branch?tmuxSession=${encodeURIComponent(tmuxSession)}`,
      );
      if (!res.ok) {
        setBranch(null);
        return;
      }
      const data = await res.json();
      setBranch(data.branch ?? null);
    } catch {
      setBranch(null);
    } finally {
      setIsLoading(false);
    }
  }, [tmuxSession]);

  useEffect(() => {
    if (!tmuxSession) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchBranch();

    intervalRef.current = setInterval(fetchBranch, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tmuxSession, fetchBranch]);

  return { branch, isLoading };
};

export default useGitBranch;
