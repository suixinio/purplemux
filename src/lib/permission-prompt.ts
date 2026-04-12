const OPTION_KEYWORDS = [
  'Yes', 'Yes,', 'No',
  'Accept', 'Decline',
  'Open System Settings', 'Try again',
  'Use this', 'Continue without',
  // ink Select dialog keywords (Resume Return, Idle Return)
  'Resume from summary', 'Resume full session',
  'Continue this conversation', 'Send message as',
  "Don't ask me again",
];
const INDICATOR_RE = /^\s*(?:[❯›>]\s+)?(.+)$/;
const FOCUSED_RE = /^\s*[❯›>]\s+/;
const NUMBER_PREFIX_RE = /^\d+\.\s+/;
// 좁은 터미널에서 "2. Yes..."가 "2Yes..."로 렌더되는 wrap 아티팩트까지 허용하기 위해 period/space를 optional로 둠
const NUMBERED_LINE_RE = /^\s*([❯›>])?\s*(\d+)\.?\s*(\S.*)$/;

const stripPrefix = (o: string) => o.replace(NUMBER_PREFIX_RE, '');
const hasOption = (options: string[], prefix: string) =>
  options.some((o) => stripPrefix(o).startsWith(prefix));

const isKnownPromptPattern = (options: string[]): boolean => {
  if (options.length < 2) return false;
  return (hasOption(options, 'Yes') && hasOption(options, 'No'))
    || (hasOption(options, 'Accept') && hasOption(options, 'Decline'))
    || hasOption(options, 'Open System Settings')
    || (hasOption(options, 'Use this') && hasOption(options, 'Continue without'))
    || (hasOption(options, 'Resume from summary') && hasOption(options, 'Resume full session'))
    || (hasOption(options, 'Continue this conversation') && hasOption(options, 'Send message as'));
};

const parseNumberedOptions = (lines: string[]): { options: string[]; focusedIndex: number } => {
  const options: string[] = [];
  let focusedIndex = 0;
  let expected = 1;
  let started = false;

  for (const line of lines) {
    if (!line.trim()) {
      if (started) break;
      continue;
    }

    const match = line.match(NUMBERED_LINE_RE);
    if (match) {
      const marker = match[1];
      const num = Number(match[2]);
      const rest = match[3].trim();
      if (num === expected && rest.length > 0) {
        if (marker) focusedIndex = options.length;
        options.push(`${num}. ${rest}`);
        expected += 1;
        started = true;
        continue;
      }
    }

    if (started) {
      if (/^\s+\S/.test(line)) continue;
      break;
    }
  }

  return { options, focusedIndex };
};

const parseKeywordOptions = (lines: string[]): { options: string[]; focusedIndex: number } => {
  const options: string[] = [];
  let focusedIndex = 0;
  let foundFirst = false;

  for (const line of lines) {
    if (!line.trim()) {
      if (foundFirst) break;
      continue;
    }

    const isFocused = FOCUSED_RE.test(line);
    const isIndented = /^\s+\S/.test(line);

    if (!isFocused && !isIndented) {
      if (foundFirst) break;
      continue;
    }

    const match = line.match(INDICATOR_RE);
    if (!match) continue;
    const label = match[1].trim();
    const stripped = stripPrefix(label);
    const isKeyword = OPTION_KEYWORDS.some((kw) => stripped.startsWith(kw));

    if (isKeyword) {
      if (isFocused) focusedIndex = options.length;
      options.push(label);
      foundFirst = true;
    }
  }

  return { options, focusedIndex };
};

export const parsePermissionOptions = (paneContent: string): { options: string[]; focusedIndex: number } => {
  const lines = paneContent.split('\n');

  const numbered = parseNumberedOptions(lines);
  if (numbered.options.length >= 2 && isKnownPromptPattern(numbered.options)) {
    return numbered;
  }

  const keyword = parseKeywordOptions(lines);
  if (!isKnownPromptPattern(keyword.options)) {
    return { options: [], focusedIndex: 0 };
  }
  return keyword;
};

export const hasPermissionPrompt = (paneContent: string): boolean =>
  parsePermissionOptions(paneContent).options.length > 0;
