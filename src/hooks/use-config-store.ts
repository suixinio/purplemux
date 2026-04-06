import { create } from 'zustand';

export interface IConfigInitialData {
  appTheme?: string | null;
  terminalTheme?: { light: string; dark: string } | null;
  dangerouslySkipPermissions?: boolean;
  editorUrl?: string;
  agentEnabled?: boolean;
  hasAuthPassword?: boolean;
}

interface IConfigState {
  dangerouslySkipPermissions: boolean;
  editorUrl: string;
  agentEnabled: boolean;
  hasAuthPassword: boolean;

  hydrate: (data: IConfigInitialData) => void;
  setDangerouslySkipPermissions: (enabled: boolean) => void;
  setEditorUrl: (url: string) => void;
  setAgentEnabled: (enabled: boolean) => void;
  changePassword: (password: string) => void;
}

const getInitialConfig = (): Pick<IConfigState, 'agentEnabled' | 'editorUrl' | 'dangerouslySkipPermissions' | 'hasAuthPassword'> => {
  if (typeof window !== 'undefined') {
    const cfg = (window as unknown as Record<string, unknown>).__CFG__ as
      | { ae: boolean; eu: string; dsp: boolean; hap: boolean }
      | undefined;
    if (cfg) {
      return {
        agentEnabled: cfg.ae,
        editorUrl: cfg.eu,
        dangerouslySkipPermissions: cfg.dsp,
        hasAuthPassword: cfg.hap,
      };
    }
  }
  return { agentEnabled: false, editorUrl: '', dangerouslySkipPermissions: false, hasAuthPassword: false };
};

const initialConfig = getInitialConfig();

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
  dangerouslySkipPermissions: initialConfig.dangerouslySkipPermissions,
  editorUrl: initialConfig.editorUrl,
  agentEnabled: initialConfig.agentEnabled,
  hasAuthPassword: initialConfig.hasAuthPassword,

  hydrate: (data) => {
    set({
      dangerouslySkipPermissions: data.dangerouslySkipPermissions ?? false,
      editorUrl: data.editorUrl ?? '',
      agentEnabled: data.agentEnabled ?? false,
      hasAuthPassword: data.hasAuthPassword ?? false,
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

  setAgentEnabled: (enabled) => {
    set({ agentEnabled: enabled });
    saveConfig({ agentEnabled: enabled });
  },

  changePassword: (password) => {
    set({ hasAuthPassword: true });
    saveConfig({ authPassword: password });
  },
}));

export default useConfigStore;
