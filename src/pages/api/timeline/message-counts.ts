import type { NextApiRequest, NextApiResponse } from 'next';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { createInterface } from 'readline';
import { isAllowedJsonlPath } from '@/lib/path-validation';

interface IRawEntry {
  type?: string;
  uuid?: string;
  requestId?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  message?: {
    content?: unknown;
  };
  payload?: {
    type?: string;
    role?: string;
    message?: string;
    name?: string;
    content?: unknown;
  };
}

interface ICountResult {
  userCount: number;
  assistantCount: number;
  toolCount: number;
  toolBreakdown: Record<string, number>;
}

interface ICacheEntry {
  counts: ICountResult;
  mtime: number;
  size: number;
}

const CACHE_LIMIT = 100;

const g = globalThis as unknown as { __pmuxMessageCountsCache?: Map<string, ICacheEntry> };
if (!g.__pmuxMessageCountsCache) g.__pmuxMessageCountsCache = new Map();
const cache = g.__pmuxMessageCountsCache;

const cacheGet = (key: string, mtime: number, size: number): ICountResult | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.mtime !== mtime || entry.size !== size) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.counts;
};

const cacheSet = (key: string, counts: ICountResult, mtime: number, size: number) => {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { counts, mtime, size });
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
};

const isRealUserMessage = (entry: IRawEntry): boolean => {
  const content = entry.message?.content;
  if (typeof content === 'string') return content.length > 0;
  if (Array.isArray(content)) {
    return content.some((c) => {
      if (typeof c !== 'object' || c === null) return false;
      return (c as { type?: string }).type !== 'tool_result';
    });
  }
  return false;
};

const isRealCodexUserMessage = (message: unknown): boolean => {
  if (typeof message !== 'string') return false;
  const text = message.trim();
  if (!text) return false;
  if (text.startsWith('<') && text.includes('environment_context')) return false;
  if (text.startsWith('<') && text.includes('user_instructions')) return false;
  if (text.startsWith('# AGENTS.md instructions')) return false;
  return true;
};

const hasCodexResponseText = (content: unknown): boolean => {
  if (typeof content === 'string') return content.trim().length > 0;
  if (!Array.isArray(content)) return false;
  return content.some((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const block = item as { type?: string; text?: string };
    if (block.type !== 'output_text' && block.type !== 'input_text') return false;
    return typeof block.text === 'string' && block.text.trim().length > 0;
  });
};

const hasCodexUserText = (content: unknown): boolean => {
  if (typeof content === 'string') return isRealCodexUserMessage(content);
  if (!Array.isArray(content)) return false;
  return content.some((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const block = item as { type?: string; text?: string };
    return block.type === 'input_text' && isRealCodexUserMessage(block.text);
  });
};

export const countMessages = async (filePath: string): Promise<ICountResult> => {
  let claudeUserCount = 0;
  let toolCount = 0;
  const assistantIds = new Set<string>();
  const toolBreakdown: Record<string, number> = {};
  let codexUserCount = 0;
  let codexAssistantCount = 0;
  let codexFallbackUserCount = 0;
  let codexFallbackAssistantCount = 0;

  const stream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      let obj: IRawEntry;
      try {
        obj = JSON.parse(line) as IRawEntry;
      } catch {
        continue;
      }
      if (obj.isMeta === true) continue;
      if (obj.isSidechain === true) continue;

      if (obj.type === 'assistant') {
        const id = obj.requestId ?? obj.uuid;
        if (id) assistantIds.add(id);

        const content = obj.message?.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (typeof item !== 'object' || item === null) continue;
            const itemType = (item as { type?: string }).type;
            if (itemType !== 'tool_use') continue;
            toolCount++;
            const name = (item as { name?: string }).name;
            if (name) toolBreakdown[name] = (toolBreakdown[name] ?? 0) + 1;
          }
        }
      } else if (obj.type === 'user' && isRealUserMessage(obj)) {
        claudeUserCount++;
      } else if (obj.type === 'event_msg') {
        const payload = obj.payload;
        if (payload?.type === 'user_message' && isRealCodexUserMessage(payload.message)) {
          codexUserCount++;
        } else if (payload?.type === 'agent_message' && typeof payload.message === 'string' && payload.message.trim()) {
          codexAssistantCount++;
        }
      } else if (obj.type === 'response_item') {
        const payload = obj.payload;
        if (payload?.type === 'message') {
          if (payload.role === 'user' && hasCodexUserText(payload.content)) {
            codexFallbackUserCount++;
          } else if (payload.role === 'assistant' && hasCodexResponseText(payload.content)) {
            codexFallbackAssistantCount++;
          }
        } else if (payload?.type === 'function_call' || payload?.type === 'custom_tool_call' || payload?.type === 'web_search_call') {
          toolCount++;
          const name = payload.type === 'web_search_call' ? 'web_search' : payload.name;
          if (name) toolBreakdown[name] = (toolBreakdown[name] ?? 0) + 1;
        } else if (payload?.type === 'local_shell_call') {
          toolCount++;
          toolBreakdown.shell = (toolBreakdown.shell ?? 0) + 1;
        }
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  const hasCodexEventCounts = codexUserCount > 0 || codexAssistantCount > 0;

  return {
    userCount: hasCodexEventCounts ? codexUserCount : claudeUserCount + codexFallbackUserCount,
    assistantCount: hasCodexEventCounts ? codexAssistantCount : assistantIds.size + codexFallbackAssistantCount,
    toolCount,
    toolBreakdown,
  };
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const jsonlPath = req.query.jsonlPath as string;
  if (!jsonlPath) {
    return res.status(400).json({ error: 'jsonlPath parameter required' });
  }

  if (!isAllowedJsonlPath(jsonlPath)) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  try {
    const st = await stat(jsonlPath);
    const mtime = Math.floor(st.mtimeMs);
    const size = st.size;

    const cached = cacheGet(jsonlPath, mtime, size);
    if (cached) return res.status(200).json(cached);

    const counts = await countMessages(jsonlPath);
    cacheSet(jsonlPath, counts, mtime, size);
    return res.status(200).json(counts);
  } catch {
    return res.status(200).json({ userCount: 0, assistantCount: 0, toolCount: 0, toolBreakdown: {} });
  }
};

export default handler;
