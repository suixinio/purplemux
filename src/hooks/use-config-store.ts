import { create } from 'zustand';

export interface IConfigInitialData {
  terminalTheme?: { light: string; dark: string } | null;
  dangerouslySkipPermissions?: boolean;
  editorUrl?: string;
  authPassword?: string;
  authSecret?: string;
}

interface IConfigState {
  dangerouslySkipPermissions: boolean;
  editorUrl: string;
  authPassword: string;
  authSecret: string;

  hydrate: (data: IConfigInitialData) => void;
  setDangerouslySkipPermissions: (enabled: boolean) => void;
  setEditorUrl: (url: string) => void;
  setAuthCredentials: (password: string, secret: string) => void;
}

const saveConfig = (updates: Record<string, unknown>) => {
  fetch('/api/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  }).catch((err) => {
    console.log(`[config-store] update failed: ${err instanceof Error ? err.message : err}`);
  });
};

const useConfigStore = create<IConfigState>((set, get) => ({
  dangerouslySkipPermissions: false,
  editorUrl: '',
  authPassword: '',
  authSecret: '',

  hydrate: (data) => {
    set({
      dangerouslySkipPermissions: data.dangerouslySkipPermissions ?? false,
      editorUrl: data.editorUrl ?? '',
      authPassword: data.authPassword ?? '',
      authSecret: data.authSecret ?? '',
    });
  },

  setDangerouslySkipPermissions: (enabled) => {
    set({ dangerouslySkipPermissions: enabled });
    saveConfig({ dangerouslySkipPermissions: enabled });
  },

  setEditorUrl: (url) => {
    if (get().editorUrl === url) return;
    set({ editorUrl: url });
    saveConfig({ editorUrl: url });
  },

  setAuthCredentials: (password, secret) => {
    set({ authPassword: password, authSecret: secret });
    saveConfig({ authPassword: password, authSecret: secret });
  },
}));

export default useConfigStore;
