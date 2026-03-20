import os from 'os';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getWorkspaces, createWorkspace } from '@/lib/workspace-store';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    let data = getWorkspaces();
    if (data.workspaces.length === 0) {
      try {
        await createWorkspace(os.homedir());
        data = getWorkspaces();
      } catch {
        // 자동 생성 실패 시 빈 목록 반환
      }
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { directory, name } = req.body ?? {};
    if (!directory || typeof directory !== 'string') {
      return res.status(400).json({ error: 'directory 필드 필수' });
    }

    try {
      const workspace = await createWorkspace(directory, name);
      return res.status(200).json(workspace);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      const isValidation = ['존재하지', '디렉토리', '등록된'].some((k) => message.includes(k));
      return res.status(isValidation ? 400 : 500).json({ error: message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

export default handler;
