import { randomBytes } from 'crypto';
import type { NextApiRequest } from 'next';

let token: string | null = null;

export const getAgentToken = (): string => {
  if (!token) {
    token = randomBytes(32).toString('hex');
  }
  return token;
};

export const verifyAgentToken = (req: NextApiRequest): boolean => {
  const value = req.headers['x-agent-token'];
  if (!value || typeof value !== 'string') return false;
  return value === getAgentToken();
};
