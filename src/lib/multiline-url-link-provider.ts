import type { ILink, ILinkProvider, IBuffer, Terminal } from '@xterm/xterm';

const URL_START_RE = /https?:\/\//g;
const URL_CHAR_RE = /[\w\-.~:/?#@!$&*+,;=%]/;

interface IBuiltLink {
  url: string;
  startY: number;
  startX: number;
  endY: number;
  endX: number;
}

const countChar = (s: string, ch: string): number => {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === ch) n++;
  return n;
};

const trimUrl = (url: string): number => {
  let trimmed = 0;

  while (url.length > 0) {
    const last = url[url.length - 1]!;
    if (last === '.' || last === ',') {
      url = url.slice(0, -1);
      trimmed++;
      continue;
    }
    if (last === ')' && countChar(url, '(') < countChar(url, ')')) {
      url = url.slice(0, -1);
      trimmed++;
      continue;
    }
    if (last === ']' && countChar(url, '[') < countChar(url, ']')) {
      url = url.slice(0, -1);
      trimmed++;
      continue;
    }
    break;
  }

  return trimmed;
};

const buildFromPosition = (
  buffer: IBuffer,
  cols: number,
  startY: number,
  startX: number,
): IBuiltLink | null => {
  const firstLine = buffer.getLine(startY);
  if (!firstLine) return null;
  const firstText = firstLine.translateToString(true);
  if (!/^https?:\/\//.test(firstText.slice(startX))) return null;

  let url = '';
  let y = startY;
  let x = startX;
  let endY = startY;
  let endX = startX;

  while (true) {
    const line = buffer.getLine(y);
    if (!line) break;
    const text = line.translateToString(true);

    let i = x;
    while (i < text.length && URL_CHAR_RE.test(text[i]!)) {
      url += text[i];
      i++;
    }

    endY = y;
    endX = i - 1;

    if (i < text.length) break;
    if (text.length < cols) break;

    const nextLine = buffer.getLine(y + 1);
    if (!nextLine) break;
    const nextText = nextLine.translateToString(true);
    if (nextText.length === 0 || !URL_CHAR_RE.test(nextText[0]!)) break;

    y++;
    x = 0;
  }

  const trimmed = trimUrl(url);
  if (trimmed > 0) {
    url = url.slice(0, url.length - trimmed);
    endX -= trimmed;
  }

  if (url.length < 'https://'.length) return null;

  return { url, startY, startX, endY, endX };
};

const findUrlStartRow = (buffer: IBuffer, cols: number, y: number): number => {
  let curY = y;
  while (curY > 0) {
    const prevLine = buffer.getLine(curY - 1);
    const curLine = buffer.getLine(curY);
    if (!prevLine || !curLine) break;

    const prevText = prevLine.translateToString(true);
    const curText = curLine.translateToString(true);
    if (prevText.length < cols) break;

    const prevLastChar = prevText[prevText.length - 1];
    const curFirstChar = curText[0];
    if (!prevLastChar || !curFirstChar) break;
    if (!URL_CHAR_RE.test(prevLastChar) || !URL_CHAR_RE.test(curFirstChar)) break;

    curY--;
  }
  return curY;
};

export const createMultilineUrlLinkProvider = (
  terminal: Terminal,
  activate: (uri: string) => void,
): ILinkProvider => ({
  provideLinks(y, callback) {
    const buffer = terminal.buffer.active;
    const cols = terminal.cols;
    const bufferY = y - 1;
    const line = buffer.getLine(bufferY);
    if (!line) {
      callback(undefined);
      return;
    }

    const links: ILink[] = [];
    const seen = new Set<string>();

    const pushLink = (built: IBuiltLink) => {
      if (built.endY === built.startY) return;
      if (bufferY < built.startY || bufferY > built.endY) return;
      const key = `${built.startY}:${built.startX}:${built.endY}:${built.endX}`;
      if (seen.has(key)) return;
      seen.add(key);

      links.push({
        text: built.url,
        range: {
          start: { x: built.startX + 1, y: built.startY + 1 },
          end: { x: built.endX + 1, y: built.endY + 1 },
        },
        activate: (_event, text) => activate(text),
      });
    };

    const searchRow = (row: number) => {
      const rowLine = buffer.getLine(row);
      if (!rowLine) return;
      const rowText = rowLine.translateToString(true);
      URL_START_RE.lastIndex = 0;
      let match;
      while ((match = URL_START_RE.exec(rowText)) !== null) {
        const built = buildFromPosition(buffer, cols, row, match.index);
        if (built) pushLink(built);
      }
    };

    const startRow = findUrlStartRow(buffer, cols, bufferY);
    searchRow(startRow);
    if (startRow !== bufferY) searchRow(bufferY);

    callback(links.length > 0 ? links : undefined);
  },
});
