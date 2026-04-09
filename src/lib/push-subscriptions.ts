import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { PushSubscription } from 'web-push';

const BASE_DIR = path.join(os.homedir(), '.purplemux');
const SUBS_FILE = path.join(BASE_DIR, 'push-subscriptions.json');

const g = globalThis as unknown as { __ptPushLock?: Promise<void> };
if (!g.__ptPushLock) g.__ptPushLock = Promise.resolve();

const withLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  let release: () => void;
  const next = new Promise<void>((r) => { release = r; });
  const prev = g.__ptPushLock!;
  g.__ptPushLock = next;
  await prev;
  try {
    return await fn();
  } finally {
    release!();
  }
};

const readSubs = async (): Promise<PushSubscription[]> => {
  try {
    const raw = await fs.readFile(SUBS_FILE, 'utf-8');
    return JSON.parse(raw) as PushSubscription[];
  } catch {
    return [];
  }
};

const writeSubs = async (subs: PushSubscription[]): Promise<void> => {
  await fs.mkdir(BASE_DIR, { recursive: true });
  const tmp = SUBS_FILE + '.tmp';
  try {
    await fs.writeFile(tmp, JSON.stringify(subs, null, 2), { mode: 0o600 });
    await fs.rename(tmp, SUBS_FILE);
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    throw err;
  }
};

export const getSubscriptions = async (): Promise<PushSubscription[]> => readSubs();

export const addSubscription = async (sub: PushSubscription): Promise<void> =>
  withLock(async () => {
    const subs = await readSubs();
    const idx = subs.findIndex((s) => s.endpoint === sub.endpoint);
    if (idx >= 0) {
      subs[idx] = sub;
    } else {
      subs.push(sub);
    }
    await writeSubs(subs);
  });

export const removeSubscription = async (endpoint: string): Promise<void> =>
  withLock(async () => {
    const subs = await readSubs();
    const filtered = subs.filter((s) => s.endpoint !== endpoint);
    if (filtered.length !== subs.length) {
      await writeSubs(filtered);
    }
  });
