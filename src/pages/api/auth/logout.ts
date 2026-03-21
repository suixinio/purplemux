import type { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader(
    'Set-Cookie',
    'auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
  );
  return res.status(200).json({ ok: true });
};

export default handler;
