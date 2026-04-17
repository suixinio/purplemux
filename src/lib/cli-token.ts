import { randomBytes, timingSafeEqual } from 'crypto';
import type { NextApiRequest } from 'next';

const g = globalThis as unknown as { __ptCliToken?: string };

export const getCliToken = (): string => {
  if (!g.__ptCliToken) {
    g.__ptCliToken = randomBytes(32).toString('hex');
  }
  return g.__ptCliToken;
};

export const verifyTokenValue = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const expected = getCliToken();
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
};

export const verifyCliToken = (req: NextApiRequest): boolean => {
  const value = req.headers['x-pmux-token'];
  return verifyTokenValue(typeof value === 'string' ? value : undefined);
};
