import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { createLogger } from '@/lib/logger';
import { RATE_LIMITS_FILE } from '@/lib/statusline-script';
import type { IRateLimitsCache } from '@/types/status';

const log = createLogger('rate-limits');

const DEBOUNCE_MS = 500;

export type TRateLimitsCallback = (data: IRateLimitsCache) => void;

export const createRateLimitsWatcher = (onChange: TRateLimitsCallback) => {
  let watcher: fs.FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTs = 0;
  const watchDir = path.dirname(RATE_LIMITS_FILE);
  const watchFilename = path.basename(RATE_LIMITS_FILE);

  const readAndNotify = async () => {
    try {
      const raw = await fsPromises.readFile(RATE_LIMITS_FILE, 'utf-8');
      const data = JSON.parse(raw) as IRateLimitsCache;
      if (data.ts && data.ts !== lastTs) {
        lastTs = data.ts;
        onChange(data);
      }
    } catch {
      // file not yet created or invalid json
    }
  };

  const start = () => {
    readAndNotify();

    try {
      watcher = fs.watch(watchDir, (_eventType, filename) => {
        if (filename !== watchFilename) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(readAndNotify, DEBOUNCE_MS);
      });

      watcher.on('error', () => {
        log.debug(`${watchDir} watch error, retrying...`);
        stop();
        setTimeout(start, 5_000);
      });
    } catch {
      log.debug(`${watchDir} not available yet, retrying...`);
      setTimeout(start, 5_000);
    }
  };

  const stop = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (watcher) {
      watcher.close();
      watcher = null;
    }
  };

  return { start, stop };
};
