import {
  readConfig,
  updateConfig,
  hashPassword,
  generateSecret,
  isHashedPassword,
  MIN_PASSWORD_LENGTH,
} from '@/lib/config-store';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth-credentials');

interface IAuthCredentials {
  password: string;
  secret: string;
  init: boolean;
}

const consumeInitPasswordEnv = (): string | null => {
  const value = process.env.INIT_PASSWORD;
  if (!value) return null;
  if (value.length < MIN_PASSWORD_LENGTH) {
    log.warn(`INIT_PASSWORD ignored: must be at least ${MIN_PASSWORD_LENGTH} characters`);
    delete process.env.INIT_PASSWORD;
    return null;
  }
  return value;
};

export const initAuthCredentials = async (): Promise<IAuthCredentials | null> => {
  const config = await readConfig();

  if (isHashedPassword(config?.authPassword) && config?.authSecret) {
    delete process.env.INIT_PASSWORD;
    return { password: config.authPassword!, secret: config.authSecret, init: false };
  }

  const initPassword = consumeInitPasswordEnv();
  if (!initPassword) return null;

  const hashed = await hashPassword(initPassword);
  const secret = config?.authSecret ?? generateSecret();

  if (!config?.authSecret) {
    await updateConfig({ authSecret: secret });
  }

  return { password: hashed, secret, init: true };
};
