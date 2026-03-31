import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig, updateConfig, hashPassword } from '@/lib/config-store';
import type { IConfigData } from '@/lib/config-store';

const ALLOWED_FIELDS: (keyof Omit<IConfigData, 'updatedAt'>)[] = [
  'terminalTheme', 'dangerouslySkipPermissions', 'editorUrl', 'authPassword', 'authSecret',
];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const data = await getConfig();
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    if (typeof updates.authPassword === 'string' && updates.authPassword) {
      updates.authPassword = hashPassword(updates.authPassword as string);
    }

    await updateConfig(updates as Partial<Omit<IConfigData, 'updatedAt'>>);

    if (updates.authPassword && updates.authSecret) {
      process.env.AUTH_PASSWORD = updates.authPassword as string;
      process.env.NEXTAUTH_SECRET = updates.authSecret as string;
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
};

export default handler;
