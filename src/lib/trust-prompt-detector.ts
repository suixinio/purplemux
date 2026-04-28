const SIGNATURES = [
  /Quick safety check/i,
  /Yes,\s+I trust this folder/i,
  /No,\s+exit/i,
];

const ANCHOR_RE = /Quick safety check/i;
const ABS_PATH_RE = /(\/[^\s│]+)/;

export type TTrustAnswer = 'yes' | 'no';

export interface ITrustPromptInfo {
  folderPath: string;
}

export const matchTrustPrompt = (text: string): ITrustPromptInfo | null => {
  for (const re of SIGNATURES) {
    if (!re.test(text)) return null;
  }

  const lines = text.split('\n');
  const anchorIdx = lines.findIndex((line) => ANCHOR_RE.test(line));
  if (anchorIdx < 0) return null;

  for (let i = anchorIdx - 1; i >= Math.max(0, anchorIdx - 6); i--) {
    const m = lines[i].match(ABS_PATH_RE);
    if (m && m[1].length > 1) return { folderPath: m[1].trim() };
  }
  return null;
};
