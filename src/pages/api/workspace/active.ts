import type { NextApiRequest, NextApiResponse } from 'next';
import { updateActive } from '@/lib/workspace-store';
import { hashPassword } from '@/lib/auth-credentials';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sidebarCollapsed, sidebarWidth, terminalTheme, dangerouslySkipPermissions, editorUrl, authPassword, authSecret } = req.body ?? {};
  const hashedPassword = typeof authPassword === 'string' && authPassword ? hashPassword(authPassword) : authPassword;
  await updateActive({ sidebarCollapsed, sidebarWidth, terminalTheme, dangerouslySkipPermissions, editorUrl, authPassword: hashedPassword, authSecret });
  return res.status(200).json({ ok: true });
};

export default handler;
