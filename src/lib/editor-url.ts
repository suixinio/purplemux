export type TEditorPreset =
  | 'code-server'
  | 'vscode'
  | 'vscode-insiders'
  | 'cursor'
  | 'windsurf'
  | 'zed'
  | 'custom';

export const EDITOR_PRESETS: readonly TEditorPreset[] = [
  'code-server',
  'vscode',
  'vscode-insiders',
  'cursor',
  'windsurf',
  'zed',
  'custom',
] as const;

export const isValidEditorPreset = (value: unknown): value is TEditorPreset =>
  typeof value === 'string' && (EDITOR_PRESETS as readonly string[]).includes(value);

const ensureLeadingSlash = (folder: string): string =>
  folder.startsWith('/') ? folder : `/${folder}`;

export const buildEditorUrl = (
  preset: TEditorPreset,
  url: string,
  folder: string,
): string | null => {
  const path = ensureLeadingSlash(folder || '/');
  const encoded = encodeURIComponent(path);

  switch (preset) {
    case 'code-server': {
      const base = url.trim();
      if (!base) return null;
      const separator = base.includes('?') ? '&' : '?';
      return `${base}${separator}folder=${encoded}`;
    }
    case 'vscode':
      return `vscode://file${path}`;
    case 'vscode-insiders':
      return `vscode-insiders://file${path}`;
    case 'cursor':
      return `cursor://file${path}`;
    case 'windsurf':
      return `windsurf://file${path}`;
    case 'zed':
      return `zed://file${path}`;
    case 'custom': {
      const template = url.trim();
      if (!template) return null;
      return template
        .replace(/\{folderEncoded\}/g, encoded)
        .replace(/\{folder\}/g, path);
    }
    default:
      return null;
  }
};

export const isWebEditorUrl = (target: string): boolean =>
  /^https?:\/\//i.test(target);

const VALID_URI_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const BLOCKED_SCHEME = /^(javascript|data|vbscript|blob|file|about|view-source):/i;

export const isSafeEditorTarget = (target: string): boolean =>
  VALID_URI_SCHEME.test(target) && !BLOCKED_SCHEME.test(target);
