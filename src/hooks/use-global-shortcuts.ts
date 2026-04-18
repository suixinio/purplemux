import { useHotkeys } from 'react-hotkeys-hook';
import { useRouter } from 'next/router';
import useWorkspaceStore from '@/hooks/use-workspace-store';
import { useSelectWorkspace } from '@/hooks/use-sidebar-actions';
import { WORKSPACE_NUMBER_KEYS, KEY_MAP } from '@/lib/keyboard-shortcuts';

const useGlobalShortcuts = () => {
  const selectWorkspace = useSelectWorkspace();
  const router = useRouter();
  const isSettingsDialogOpen = useWorkspaceStore((s) => s.isSettingsDialogOpen);

  const hotkeyOptions = {
    preventDefault: true,
    enableOnFormTags: true as const,
    enabled: !isSettingsDialogOpen,
  };

  useHotkeys(
    WORKSPACE_NUMBER_KEYS,
    (event) => {
      const { workspaces } = useWorkspaceStore.getState();
      const digit = parseInt(event.code.replace('Digit', ''), 10);
      if (isNaN(digit) || digit < 1 || digit > 9) return;

      const workspace =
        digit === 9
          ? workspaces[workspaces.length - 1]
          : workspaces[digit - 1];
      if (workspace) {
        selectWorkspace(workspace.id);
      }
    },
    hotkeyOptions,
  );

  useHotkeys(
    KEY_MAP.SETTINGS,
    () => {
      window.dispatchEvent(new Event('open-settings'));
    },
    { preventDefault: true, enableOnFormTags: true as const },
  );

  useHotkeys(
    KEY_MAP.NEW_WORKSPACE,
    async () => {
      const store = useWorkspaceStore.getState();
      const ws = await store.createWorkspace('');
      if (ws) selectWorkspace(ws.id);
    },
    hotkeyOptions,
  );

  useHotkeys(
    KEY_MAP.RENAME_WORKSPACE,
    () => {
      const { activeWorkspaceId } = useWorkspaceStore.getState();
      if (!activeWorkspaceId) return;
      window.dispatchEvent(
        new CustomEvent('rename-workspace', { detail: activeWorkspaceId }),
      );
    },
    hotkeyOptions,
  );

  useHotkeys(
    KEY_MAP.TOGGLE_SIDEBAR,
    () => {
      useWorkspaceStore.getState().toggleSidebar();
    },
    hotkeyOptions,
  );

  useHotkeys(
    KEY_MAP.NOTES,
    () => {
      router.push('/reports');
    },
    hotkeyOptions,
  );

  useHotkeys(
    KEY_MAP.STATS,
    () => {
      router.push('/stats');
    },
    hotkeyOptions,
  );
};

export default useGlobalShortcuts;
