import type { NextApiRequest, NextApiResponse } from 'next';
import { readQuickPrompts, writeQuickPrompts } from '@/lib/quick-prompts-store';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const prompts = await readQuickPrompts();
    return res.status(200).json(prompts);
  }

  if (req.method === 'PUT') {
    const prompts = req.body;
    if (!Array.isArray(prompts)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }
    await writeQuickPrompts(prompts);
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
};

export default handler;
