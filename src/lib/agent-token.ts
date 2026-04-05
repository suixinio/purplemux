import { randomBytes, timingSafeEqual } from 'crypto';
import type { NextApiRequest } from 'next';

const g = globalThis as unknown as { __ptAgentToken?: string };

export const getAgentToken = (): string => {
  if (!g.__ptAgentToken) {
    g.__ptAgentToken = randomBytes(32).toString('hex');
  }
  return g.__ptAgentToken;
};

export const verifyTokenValue = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const expected = getAgentToken();
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
};

export const verifyAgentToken = (req: NextApiRequest): boolean => {
  const value = req.headers['x-agent-token'];
  return verifyTokenValue(typeof value === 'string' ? value : undefined);
};
