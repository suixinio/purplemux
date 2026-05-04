export interface IToolStatus {
  installed: boolean;
  version: string | null;
}

export interface ICodexStatus extends IToolStatus {
  binaryPath: string | null;
}

export interface IPreflightResult {
  tmux: IToolStatus & { compatible: boolean };
  git: IToolStatus;
  claude: IToolStatus & { binaryPath: string | null; loggedIn: boolean };
  codex: ICodexStatus;
  brew?: IToolStatus;
  clt?: { installed: boolean };
}

export interface IRuntimePreflightResult {
  tmux: IToolStatus & { compatible: boolean };
  git: IToolStatus;
  claude: IToolStatus;
  codex: IToolStatus;
}

export const isRuntimeOk = (status: IRuntimePreflightResult): boolean =>
  status.tmux.installed && status.tmux.compatible && status.git.installed;
