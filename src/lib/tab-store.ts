import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { nanoid } from 'nanoid';
import { listSessions, createSession, killSession } from '@/lib/tmux';

interface ITab {
  id: string;
  sessionName: string;
  name: string;
  order: number;
}

interface ITabStore {
  tabs: ITab[];
  activeTabId: string | null;
}

interface ITabsFile {
  tabs: ITab[];
  activeTabId: string | null;
  updatedAt: string;
}

const TABS_DIR = path.join(os.homedir(), '.purple-terminal');
const TABS_FILE = path.join(TABS_DIR, 'tabs.json');
const SAVE_DEBOUNCE = 300;

let store: ITabStore = { tabs: [], activeTabId: null };
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleSave = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await fs.mkdir(TABS_DIR, { recursive: true });
      const data: ITabsFile = {
        ...store,
        updatedAt: new Date().toISOString(),
      };
      await fs.writeFile(TABS_FILE, JSON.stringify(data, null, 2));
      console.log(`[tabs] saved: ${TABS_FILE}`);
    } catch (err) {
      console.log(`[tabs] save failed: ${err instanceof Error ? err.message : err}`);
    }
  }, SAVE_DEBOUNCE);
};

export const flushToDisk = async () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    await fs.mkdir(TABS_DIR, { recursive: true });
    const data: ITabsFile = {
      ...store,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(TABS_FILE, JSON.stringify(data, null, 2));
    console.log(`[tabs] saved: ${TABS_FILE}`);
  } catch (err) {
    console.log(`[tabs] flush failed: ${err instanceof Error ? err.message : err}`);
  }
};

const loadFromDisk = async (): Promise<ITabStore> => {
  try {
    const raw = await fs.readFile(TABS_FILE, 'utf-8');
    const data = JSON.parse(raw) as ITabsFile;
    return {
      tabs: Array.isArray(data.tabs) ? data.tabs : [],
      activeTabId: data.activeTabId ?? null,
    };
  } catch {
    console.log('[tabs] tabs.json parse failed, starting fresh');
    return { tabs: [], activeTabId: null };
  }
};

const syncWithTmux = async () => {
  const tmuxSessions = await listSessions();
  const tabSessions = new Set(store.tabs.map((t) => t.sessionName));

  const staleTabs = store.tabs.filter((tab) => !tmuxSessions.includes(tab.sessionName));
  store.tabs = store.tabs.filter((tab) => tmuxSessions.includes(tab.sessionName));

  let recoveredCount = 0;
  for (const session of tmuxSessions) {
    if (!tabSessions.has(session)) {
      store.tabs.push({
        id: `tab-${nanoid(6)}`,
        sessionName: session,
        name: `Recovered ${store.tabs.length + 1}`,
        order: store.tabs.length,
      });
      recoveredCount++;
    }
  }

  if (store.activeTabId && !store.tabs.some((t) => t.id === store.activeTabId)) {
    store.activeTabId = store.tabs[0]?.id ?? null;
  }

  console.log(`[tabs] sync: removed ${staleTabs.length} stale, recovered ${recoveredCount} orphan`);
};

export const initTabStore = async () => {
  store = await loadFromDisk();
  await syncWithTmux();
  if (store.tabs.length > 0 || store.activeTabId) {
    scheduleSave();
  }
  console.log(`[tabs] list: ${store.tabs.length} tabs`);
};

export const getTabs = (): { tabs: ITab[]; activeTabId: string | null } => ({
  tabs: [...store.tabs].sort((a, b) => a.order - b.order),
  activeTabId: store.activeTabId,
});

const nextTabName = (): string => {
  const existing = store.tabs
    .map((t) => t.name)
    .filter((n) => /^Terminal \d+$/.test(n))
    .map((n) => parseInt(n.replace('Terminal ', ''), 10));
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `Terminal ${max + 1}`;
};

export const addTab = async (name?: string): Promise<ITab> => {
  const tabId = `tab-${nanoid(6)}`;
  const sessionName = `pt-${nanoid(6)}-${nanoid(6)}-${nanoid(6)}`;
  const tabName = name?.trim() || nextTabName();
  const order = store.tabs.length > 0 ? Math.max(...store.tabs.map((t) => t.order)) + 1 : 0;

  await createSession(sessionName, 80, 24);

  const tab: ITab = { id: tabId, sessionName, name: tabName, order };
  store.tabs.push(tab);
  scheduleSave();

  console.log(`[tabs] created: ${tabId} (session: ${sessionName})`);
  return tab;
};

export const removeTab = async (tabId: string): Promise<boolean> => {
  const idx = store.tabs.findIndex((t) => t.id === tabId);
  if (idx === -1) return false;

  const tab = store.tabs[idx];
  try {
    await killSession(tab.sessionName);
  } catch {
    // session already gone
  }

  store.tabs.splice(idx, 1);
  if (store.activeTabId === tabId) {
    store.activeTabId = store.tabs[0]?.id ?? null;
  }
  scheduleSave();

  console.log(`[tabs] deleted: ${tabId}`);
  return true;
};

export const removeTabBySession = (sessionName: string): boolean => {
  const idx = store.tabs.findIndex((t) => t.sessionName === sessionName);
  if (idx === -1) return false;

  const tab = store.tabs[idx];
  store.tabs.splice(idx, 1);
  if (store.activeTabId === tab.id) {
    store.activeTabId = store.tabs[0]?.id ?? null;
  }
  scheduleSave();

  console.log(`[tabs] deleted by session exit: ${tab.id}`);
  return true;
};

export const renameTab = (tabId: string, name: string): ITab | null => {
  const tab = store.tabs.find((t) => t.id === tabId);
  if (!tab) return null;

  tab.name = name;
  scheduleSave();

  console.log(`[tabs] renamed: ${tabId} → "${name}"`);
  return { ...tab };
};

export const reorderTabs = (tabIds: string[]): ITab[] | null => {
  const currentIds = new Set(store.tabs.map((t) => t.id));
  const newIds = new Set(tabIds);

  if (currentIds.size !== newIds.size || ![...currentIds].every((id) => newIds.has(id))) {
    return null;
  }

  for (let i = 0; i < tabIds.length; i++) {
    const tab = store.tabs.find((t) => t.id === tabIds[i]);
    if (tab) tab.order = i;
  }

  scheduleSave();
  console.log(`[tabs] reordered: ${store.tabs.length} tabs`);

  return [...store.tabs].sort((a, b) => a.order - b.order);
};

export const setActiveTab = (tabId: string): void => {
  store.activeTabId = tabId;
  scheduleSave();
};
