const SHELL_NAMES = new Set(['zsh', 'bash', 'fish', 'sh', '-zsh', '-bash', '-fish', '-sh']);

const extractBasename = (path: string): string => {
  if (path === '~' || path === '/') return path;
  const cleaned = path.replace(/\/$/, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || path;
};

export const formatTabTitle = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // tmux set-titles-string: "#{pane_current_command}|#{pane_current_path}"
  const pipeIdx = trimmed.indexOf('|');
  if (pipeIdx > 0) {
    const cmd = trimmed.slice(0, pipeIdx);
    const path = trimmed.slice(pipeIdx + 1);
    if (SHELL_NAMES.has(cmd)) return extractBasename(path);
    return cmd;
  }

  // fallback: "user@host: /path" (zsh OSC title)
  const hostPathMatch = trimmed.match(/@[^:]+:\s*(.*)/);
  if (hostPathMatch) {
    return extractBasename(hostPathMatch[1].trim());
  }

  // standalone path
  if (trimmed.startsWith('/') || trimmed.startsWith('~')) {
    return extractBasename(trimmed);
  }

  // command/process name
  const cmd = trimmed.split(/\s+/)[0];
  if (SHELL_NAMES.has(cmd)) return '';

  return cmd || '';
};

export const isAutoTabName = (name: string): boolean =>
  /^Terminal \d+$/.test(name);
