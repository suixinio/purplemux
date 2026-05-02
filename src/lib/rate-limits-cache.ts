import fs from 'fs/promises';
import path from 'path';
import { RATE_LIMITS_FILE } from '@/lib/statusline-script';
import type { IRateLimitsCache, IRateLimitsData, TRateLimitsProvider } from '@/types/status';

let writeQueue: Promise<void> = Promise.resolve();

export const readRateLimitsCache = async (): Promise<Partial<IRateLimitsCache>> => {
  try {
    const raw = await fs.readFile(RATE_LIMITS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<IRateLimitsCache>;
    return {
      ...(parsed.claude ? { claude: parsed.claude } : {}),
      ...(parsed.codex ? { codex: parsed.codex } : {}),
    };
  } catch {
    return {};
  }
};

export const writeProviderRateLimits = async (
  provider: TRateLimitsProvider,
  data: IRateLimitsData,
): Promise<IRateLimitsCache> => {
  const write = async (): Promise<IRateLimitsCache> => {
    const cache = await readRateLimitsCache();
    const next: IRateLimitsCache = {
      ...cache,
      ts: data.ts,
      [provider]: data,
    };
    await fs.mkdir(path.dirname(RATE_LIMITS_FILE), { recursive: true });
    await fs.writeFile(RATE_LIMITS_FILE, JSON.stringify(next));
    return next;
  };

  const result = writeQueue.then(write, write);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
};
