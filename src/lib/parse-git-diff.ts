export interface IGitDiffFile {
  oldName: string;
  newName: string;
  oldHeaderLine: string;
  newHeaderLine: string;
  hunks: string[];
  additions: number;
  deletions: number;
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

const DIFF_HEADER = /^diff --git /;

const stripPrefix = (p: string) => {
  if (p === '/dev/null') return '/dev/null';
  return p.replace(/^[ab]\//, '');
};

export const parseMultiFileDiff = (input: string): IGitDiffFile[] => {
  if (!input.trim()) return [];

  const lines = input.split('\n');
  const files: IGitDiffFile[] = [];
  let current: IGitDiffFile | null = null;
  let hunkBuffer: string[] | null = null;
  let inHunk = false;

  const flushHunk = () => {
    if (current && hunkBuffer) current.hunks.push(hunkBuffer.join('\n'));
    hunkBuffer = null;
  };

  const flushFile = () => {
    flushHunk();
    if (current) files.push(current);
    current = null;
    inHunk = false;
  };

  for (const line of lines) {
    if (DIFF_HEADER.test(line)) {
      flushFile();
      current = {
        oldName: '',
        newName: '',
        oldHeaderLine: '',
        newHeaderLine: '',
        hunks: [],
        additions: 0,
        deletions: 0,
        isBinary: false,
        isNew: false,
        isDeleted: false,
        isRenamed: false,
      };
      continue;
    }

    if (!current) continue;

    if (!inHunk) {
      if (line.startsWith('@@')) {
        inHunk = true;
        hunkBuffer = [line];
      } else if (line.startsWith('--- ')) {
        current.oldHeaderLine = line;
        current.oldName = stripPrefix(line.slice(4).trim());
      } else if (line.startsWith('+++ ')) {
        current.newHeaderLine = line;
        current.newName = stripPrefix(line.slice(4).trim());
      } else if (line.startsWith('new file')) {
        current.isNew = true;
      } else if (line.startsWith('deleted file')) {
        current.isDeleted = true;
      } else if (line.startsWith('rename from') || line.startsWith('rename to')) {
        current.isRenamed = true;
      } else if (line.startsWith('Binary files')) {
        current.isBinary = true;
      }
      continue;
    }

    if (line.startsWith('@@')) {
      flushHunk();
      hunkBuffer = [line];
      continue;
    }

    if (!hunkBuffer) continue;
    hunkBuffer.push(line);
    if (line.startsWith('+') && !line.startsWith('+++')) current.additions += 1;
    else if (line.startsWith('-') && !line.startsWith('---')) current.deletions += 1;
  }

  flushFile();
  return files;
};

export const getDisplayName = (file: IGitDiffFile): string => {
  if (file.newName && file.newName !== '/dev/null') return file.newName;
  if (file.oldName && file.oldName !== '/dev/null') return file.oldName;
  return 'file';
};

export const buildFileDiffString = (file: IGitDiffFile): string => {
  if (file.hunks.length === 0) return '';
  const oldHeader = file.oldHeaderLine || `--- a/${file.oldName || file.newName}`;
  const newHeader = file.newHeaderLine || `+++ b/${file.newName || file.oldName}`;
  return [oldHeader, newHeader, ...file.hunks].join('\n');
};
