// Workspace prompt path mirrors getCodexPromptPath (lib/providers/codex/prompt.ts)
// and the hook override args are pre-built server-side via buildCodexHookFlags
// (lib/providers/codex/hook-config.ts). Kept literal here because this module
// runs in the browser and cannot import node-only modules. Update both sides
// together if the prompt path moves.

interface IBuildCodexLaunchCommandOptions {
  workspaceId?: string | null;
  resumeSessionId?: string | null;
  hookOverrideArgs?: readonly string[];
  dangerouslySkipPermissions?: boolean;
}

export const buildCodexLaunchCommand = ({
  workspaceId,
  resumeSessionId,
  hookOverrideArgs = [],
  dangerouslySkipPermissions,
}: IBuildCodexLaunchCommandOptions): string => {
  const parts: string[] = ['codex'];
  if (resumeSessionId) parts.push('resume', resumeSessionId);
  parts.push(...hookOverrideArgs);
  if (workspaceId) {
    const promptPath = `~/.purplemux/workspaces/${workspaceId}/codex-prompt.md`;
    parts.push('-c', `"developer_instructions='''$(cat ${promptPath})'''"`);
  }
  if (dangerouslySkipPermissions) parts.push('--yolo');
  return parts.join(' ');
};
