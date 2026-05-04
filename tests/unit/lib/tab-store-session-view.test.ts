import { beforeEach, describe, expect, it } from 'vitest';
import useTabStore from '@/hooks/use-tab-store';

type ServerTabs = Parameters<ReturnType<typeof useTabStore.getState>['syncAllFromServer']>[0];
type ServerTab = ServerTabs[string];

const resetStore = () => {
  useTabStore.setState({
    tabs: {},
    tabOrders: {},
    statusWsConnected: false,
  });
};

const serverTab = (overrides: Partial<ServerTab>): ServerTab => ({
  cliState: 'inactive' as const,
  workspaceId: 'ws-test',
  panelType: 'claude-code' as const,
  tabName: 'agent',
  agentSessionId: null,
  ...overrides,
});

describe('tab store session view transitions', () => {
  beforeEach(resetStore);

  it('keeps booting agent tabs on the check view when a live process check is still false', () => {
    useTabStore.getState().initTab('tab-1', {
      workspaceId: 'ws-test',
      panelType: 'claude-code',
      sessionView: 'check',
      agentSessionId: 'session-1',
      isTimelineLoading: false,
    });

    useTabStore.getState().setDetectedAgent('tab-1', { running: false, checkedAt: 1 });

    expect(useTabStore.getState().tabs['tab-1'].sessionView).toBe('check');
  });

  it('moves a loaded agent timeline to the session list when the live process check fails', () => {
    useTabStore.getState().initTab('tab-1', {
      workspaceId: 'ws-test',
      panelType: 'codex-cli',
      sessionView: 'timeline',
      agentSessionId: 'session-1',
      isTimelineLoading: false,
    });

    useTabStore.getState().setDetectedAgent('tab-1', { running: false, checkedAt: 1 });

    expect(useTabStore.getState().tabs['tab-1'].sessionView).toBe('session-list');
  });

  it('does not promote an inactive saved session from the session list back to the timeline during server sync', () => {
    useTabStore.getState().initTab('tab-1', {
      workspaceId: 'ws-test',
      panelType: 'claude-code',
      sessionView: 'session-list',
      agentSessionId: 'session-1',
    });

    useTabStore.getState().syncAllFromServer({
      'tab-1': serverTab({ cliState: 'inactive', agentSessionId: 'session-1' }),
    });

    expect(useTabStore.getState().tabs['tab-1'].sessionView).toBe('session-list');
  });

  it('still promotes booting check views once an active agent state arrives from the server', () => {
    useTabStore.getState().initTab('tab-1', {
      workspaceId: 'ws-test',
      panelType: 'claude-code',
      sessionView: 'check',
    });

    useTabStore.getState().syncAllFromServer({
      'tab-1': serverTab({ cliState: 'idle' }),
    });

    expect(useTabStore.getState().tabs['tab-1'].sessionView).toBe('timeline');
  });
});
