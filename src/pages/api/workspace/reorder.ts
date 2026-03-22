import type { NextApiRequest, NextApiResponse } from 'next';
import { reorderWorkspaces } from '@/lib/workspace-store';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workspaceIds } = req.body ?? {};
  if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) {
    return res.status(400).json({ error: 'workspaceIds 배열이 필요합니다' });
  }

  const ok = await reorderWorkspaces(workspaceIds);
  if (!ok) {
    return res.status(400).json({ error: '유효하지 않은 순서입니다' });
  }

  return res.status(200).json({ ok: true });
};

export default handler;
