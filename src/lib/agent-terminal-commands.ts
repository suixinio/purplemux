const CODEX_QUIT_SUBMIT_DELAY_MS = 80;

export const sendCodexQuitCommand = (sendStdin: (data: string) => void): void => {
  sendStdin('/quit');
  window.setTimeout(() => sendStdin('\r'), CODEX_QUIT_SUBMIT_DELAY_MS);
};
