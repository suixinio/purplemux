import type { NextApiRequest, NextApiResponse } from 'next';
import { moveTabBetweenPanes } from '@/lib/layout-store';
import { getActiveWorkspaceId } from '@/lib/workspace-store';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wsId = (req.query.workspace as string) || await getActiveWorkspaceId();
  if (!wsId) {
    return res.status(400).json({ error: 'Workspace가 없습니다' });
  }

  const tabId = req.query.tabId as string;
  const fromPaneId = req.query.paneId as string;
  const { toPaneId, toIndex } = req.body ?? {};

  if (!toPaneId || toIndex === undefined) {
    return res.status(400).json({ error: 'toPaneId, toIndex 필수' });
  }

  const result = await moveTabBetweenPanes(wsId, tabId, fromPaneId, toPaneId, toIndex);
  if (!result) {
    return res.status(404).json({ error: '대상을 찾을 수 없습니다' });
  }
  return res.status(200).json(result);
};

export default handler;
