import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface IQuickPrompt {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
}

const BASE_DIR = path.join(os.homedir(), '.purple-terminal');
const FILE_PATH = path.join(BASE_DIR, 'quick-prompts.json');

const BUILTIN_PROMPTS: IQuickPrompt[] = [
  { id: 'builtin-commit', name: '커밋하기', prompt: '/commit-commands:commit', enabled: true },
];

const readQuickPrompts = async (): Promise<IQuickPrompt[]> => {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return BUILTIN_PROMPTS;
    return parsed;
  } catch {
    return BUILTIN_PROMPTS;
  }
};

const writeQuickPrompts = async (prompts: IQuickPrompt[]): Promise<void> => {
  await fs.mkdir(BASE_DIR, { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(prompts, null, 2), 'utf-8');
};

export { readQuickPrompts, writeQuickPrompts, BUILTIN_PROMPTS };
export type { IQuickPrompt };
