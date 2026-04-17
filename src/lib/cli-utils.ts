import { getLayout } from '@/lib/layout-store';
import { collectPanes, getFirstPaneId } from '@/lib/layout-tree';
import { getWorkspaceById } from '@/lib/workspace-store';
import type { ITab } from '@/types/terminal';

export interface ITabLocation {
  workspaceId: string;
  paneId: string;
  tab: ITab;
}

export const findTab = async (
  workspaceId: string,
  tabId: string,
): Promise<ITabLocation | null> => {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) return null;
  const layout = await getLayout(workspaceId);
  for (const pane of collectPanes(layout.root)) {
    const tab = pane.tabs.find((t) => t.id === tabId);
    if (tab) return { workspaceId, paneId: pane.id, tab };
  }
  return null;
};

export const resolveFirstPaneId = async (workspaceId: string): Promise<string | null> => {
  const layout = await getLayout(workspaceId);
  const paneId = getFirstPaneId(layout.root);
  return paneId || null;
};
