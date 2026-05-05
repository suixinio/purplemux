export type TTrustAnswer = 'yes' | 'no';
export type TTrustAgent = 'claude' | 'codex';

export interface ITrustPromptInfo {
  agent: TTrustAgent;
  folderPath: string;
}

interface ITrustSpec {
  agent: TTrustAgent;
  signatures: RegExp[];
  extractPath: (lines: string[]) => string | null;
}

const ABS_PATH_RE = /(\/[^\s│]+)/;
const CLAUDE_ANCHOR_RE = /Quick safety check/i;
const CODEX_YOU_ARE_IN_RE = /You are in\s+(\/\S+)/i;
const CODEX_GIT_ROOT_RE = /repository root:\s*(\/\S+)/i;

const SPECS: ITrustSpec[] = [
  {
    agent: 'claude',
    signatures: [
      /Quick safety check/i,
      /Yes,\s+I trust this folder/i,
      /No,\s+exit/i,
    ],
    extractPath: (lines) => {
      const anchorIdx = lines.findIndex((line) => CLAUDE_ANCHOR_RE.test(line));
      if (anchorIdx < 0) return null;
      for (let i = anchorIdx - 1; i >= Math.max(0, anchorIdx - 6); i--) {
        const m = lines[i].match(ABS_PATH_RE);
        if (m && m[1].length > 1) return m[1].trim();
      }
      return null;
    },
  },
  {
    agent: 'codex',
    signatures: [
      /Do you trust the contents of this directory/i,
      /Yes,\s+continue/i,
      /No,\s+quit/i,
    ],
    extractPath: (lines) => {
      for (const line of lines) {
        const m = line.match(CODEX_GIT_ROOT_RE);
        if (m && m[1].length > 1) return m[1].trim();
      }
      for (const line of lines) {
        const m = line.match(CODEX_YOU_ARE_IN_RE);
        if (m && m[1].length > 1) return m[1].trim();
      }
      return null;
    },
  },
];

export const matchTrustPrompt = (text: string): ITrustPromptInfo | null => {
  const lines = text.split('\n');
  for (const spec of SPECS) {
    if (!spec.signatures.every((re) => re.test(text))) continue;
    const folderPath = spec.extractPath(lines);
    if (folderPath) return { agent: spec.agent, folderPath };
  }
  return null;
};
