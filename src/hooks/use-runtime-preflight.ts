import { useCallback, useEffect, useState } from 'react';
import type { IRuntimePreflightResult } from '@/types/preflight';

interface IUseRuntimePreflight {
  status: IRuntimePreflightResult | null;
  checking: boolean;
  recheck: () => Promise<void>;
}

export const useRuntimePreflight = (): IUseRuntimePreflight => {
  const [status, setStatus] = useState<IRuntimePreflightResult | null>(null);
  const [checking, setChecking] = useState(true);

  const fetchStatus = useCallback(async (method: 'GET' | 'POST') => {
    setChecking(true);
    try {
      const res = await fetch('/api/preflight/runtime', { method });
      const data: IRuntimePreflightResult = await res.json();
      setStatus(data);
    } catch {
      // 실패 시 기존 상태 유지
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus('GET');
  }, [fetchStatus]);

  const recheck = useCallback(() => fetchStatus('POST'), [fetchStatus]);

  return { status, checking, recheck };
};
