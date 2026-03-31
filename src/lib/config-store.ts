import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { broadcastSync } from '@/lib/sync-server';

export interface IConfigData {
  authPassword?: string;
  authSecret?: string;
  terminalTheme?: { light: string; dark: string };
  dangerouslySkipPermissions?: boolean;
  editorUrl?: string;
  updatedAt: string;
}

const BASE_DIR = path.join(os.homedir(), '.purplemux');
const CONFIG_FILE = path.join(BASE_DIR, 'config.json');

const g = globalThis as unknown as {
  __ptConfigLock?: Promise<void>;
  __ptConfigContentCache?: string;
};
if (!g.__ptConfigLock) g.__ptConfigLock = Promise.resolve();

const withLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  let release: () => void;
  const next = new Promise<void>((r) => {
    release = r;
  });
  const prev = g.__ptConfigLock!;
  g.__ptConfigLock = next;
  await prev;
  try {
    return await fn();
  } finally {
    release!();
  }
};

const emptyConfig = (): IConfigData => ({
  updatedAt: new Date().toISOString(),
});

export const readConfig = async (): Promise<IConfigData | null> => {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as IConfigData;
  } catch {
    return null;
  }
};

export const writeConfig = async (data: IConfigData): Promise<void> => {
  const { updatedAt: _, ...rest } = data;
  const contentKey = JSON.stringify(rest);
  if (g.__ptConfigContentCache === contentKey) return;

  data.updatedAt = new Date().toISOString();
  const tmpFile = CONFIG_FILE + '.tmp';
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2));
  await fs.rename(tmpFile, CONFIG_FILE);

  g.__ptConfigContentCache = contentKey;
  broadcastSync({ type: 'config' });
};

export const hashPassword = (plain: string): string =>
  crypto.createHash('sha512').update(plain).digest('hex');

export const getConfig = async (): Promise<IConfigData> => {
  const data = await readConfig();
  return data ?? emptyConfig();
};

export const updateConfig = async (updates: Partial<Omit<IConfigData, 'updatedAt'>>): Promise<void> =>
  withLock(async () => {
    const data = (await readConfig()) ?? emptyConfig();
    Object.assign(data, updates);
    await writeConfig(data);
  });

export const needsSetup = async (): Promise<boolean> => {
  const data = await readConfig();
  return !data?.authPassword;
};

export const initConfigStore = async (): Promise<void> => {
  await fs.mkdir(BASE_DIR, { recursive: true });

  const existing = await readConfig();
  if (existing) {
    console.log('[purplemux] config.json 로드 완료');
    return;
  }

  await writeConfig(emptyConfig());
  console.log('[purplemux] 초기 config.json 생성 (온보딩 필요)');
};

export const getDangerouslySkipPermissions = async (): Promise<boolean> => {
  const data = await readConfig();
  return data?.dangerouslySkipPermissions ?? false;
};

export const generateSecret = (): string =>
  crypto.randomBytes(32).toString('hex');
