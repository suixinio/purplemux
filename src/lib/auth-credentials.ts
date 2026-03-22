import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface IAuthCredentials {
  password: string;
  token: string;
  parentPid: number;
}

const BASE_DIR = path.join(os.homedir(), '.purple-terminal');
const CREDENTIALS_PATH = path.join(BASE_DIR, '.auth-credentials');
const WORKSPACES_FILE = path.join(BASE_DIR, 'workspaces.json');

const generateRandomString = (length: number): string =>
  crypto.randomBytes(length).toString('hex').slice(0, length);

const readFixedAuth = (): { password: string; token: string } | null => {
  // 1. 환경변수 우선
  if (process.env.AUTH_PASSWORD && process.env.AUTH_TOKEN) {
    return { password: process.env.AUTH_PASSWORD, token: process.env.AUTH_TOKEN };
  }

  // 2. workspaces.json에 저장된 고정 인증 정보
  try {
    const data = JSON.parse(fs.readFileSync(WORKSPACES_FILE, 'utf-8'));
    if (data.authPassword && data.authToken) {
      return { password: data.authPassword, token: data.authToken };
    }
  } catch {
    // ignore
  }

  return null;
};

export const initAuthCredentials = (): IAuthCredentials & { fixed: boolean } => {
  const fixed = readFixedAuth();
  if (fixed) {
    return { ...fixed, parentPid: process.ppid, fixed: true };
  }

  const parentPid = process.ppid;

  try {
    const existing: IAuthCredentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
    if (existing.parentPid === parentPid) {
      return { ...existing, fixed: false };
    }
  } catch {
    // ignore
  }

  const credentials: IAuthCredentials = {
    password: generateRandomString(8),
    token: generateRandomString(32),
    parentPid,
  };

  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
  }

  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials));
  return { ...credentials, fixed: false };
};
