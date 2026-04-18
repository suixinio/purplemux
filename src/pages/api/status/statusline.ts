import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { verifyCliToken } from '@/lib/cli-token';
import { RATE_LIMITS_FILE } from '@/lib/statusline-script';
import { createLogger } from '@/lib/logger';

const log = createLogger('statusline');

interface IClaudeStatusInput {
  model?: { display_name?: string };
  workspace?: { project_dir?: string };
  rate_limits?: {
    five_hour?: { used_percentage: number; resets_at: number } | null;
    seven_day?: { used_percentage: number; resets_at: number } | null;
  };
  context_window?: {
    used_percentage?: number;
    remaining_percentage?: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
    context_window_size?: number;
  };
  cost?: {
    total_cost_usd?: number;
    total_duration_ms?: number;
    total_duration_api_ms?: number;
  };
}

const readUserStatusLineCommand = async (input: IClaudeStatusInput): Promise<string | null> => {
  const projectDir = input.workspace?.project_dir;
  const candidates: string[] = [];
  if (projectDir) {
    candidates.push(path.join(projectDir, '.claude', 'settings.local.json'));
    candidates.push(path.join(projectDir, '.claude', 'settings.json'));
  }
  candidates.push(path.join(os.homedir(), '.claude', 'settings.json'));

  for (const file of candidates) {
    try {
      const raw = await fs.readFile(file, 'utf-8');
      const parsed = JSON.parse(raw);
      const cmd = parsed?.statusLine?.command;
      if (typeof cmd === 'string' && cmd.trim()) return cmd;
    } catch {
      // missing or invalid; try next
    }
  }
  return null;
};

const runUserCommand = (cmd: string, input: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', cmd], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && stderr) {
        log.debug({ code, stderr }, 'user statusLine exited non-zero');
      }
      resolve(stdout);
    });
    child.stdin.write(input);
    child.stdin.end();
  });

const writeRateLimitsIfPresent = async (input: IClaudeStatusInput): Promise<void> => {
  const fiveHour = input.rate_limits?.five_hour ?? null;
  const sevenDay = input.rate_limits?.seven_day ?? null;
  if (!fiveHour && !sevenDay) return;

  const ctx = input.context_window;
  const data = {
    ts: Date.now() / 1000,
    model: input.model?.display_name ?? null,
    five_hour: fiveHour,
    seven_day: sevenDay,
    context: ctx
      ? {
          used_pct: ctx.used_percentage,
          remaining_pct: ctx.remaining_percentage,
          input_tokens: ctx.total_input_tokens,
          output_tokens: ctx.total_output_tokens,
          window_size: ctx.context_window_size,
        }
      : null,
    cost: input.cost ?? null,
  };

  try {
    await fs.writeFile(RATE_LIMITS_FILE, JSON.stringify(data));
  } catch (err) {
    log.debug({ err }, 'failed to write rate-limits.json');
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyCliToken(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const input = (req.body ?? {}) as IClaudeStatusInput;

  await writeRateLimitsIfPresent(input);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const userCmd = await readUserStatusLineCommand(input);
    if (userCmd) {
      const out = await runUserCommand(userCmd, JSON.stringify(input));
      return res.status(200).send(out);
    }
  } catch (err) {
    log.debug({ err }, 'user statusLine failed');
  }

  return res.status(204).end();
};

export default handler;
