import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyCliToken } from '@/lib/cli-token';

const GUIDE = `# purplemux CLI HTTP API

All endpoints require header \`x-pmux-token: <PMUX_TOKEN>\`.

## Workspaces

GET /api/cli/workspaces
  Response: { "workspaces": [{ "id": "...", "name": "...", "directories": [...] }] }

## Tabs

GET /api/cli/tabs?workspaceId=WS
  List tabs. Without workspaceId, lists tabs across all workspaces.
  Response: { "tabs": [{ "tabId", "workspaceId", "name", "sessionName", "panelType" }] }

POST /api/cli/tabs
  Body: { "workspaceId": "WS", "name"?: "...", "panelType"?: "terminal" | "claude-code" | "web-browser" | "diff" }
  Creates a tab in the first pane of the workspace.
  Response: { "tabId", "workspaceId", "paneId", "sessionName", "name" }

GET /api/cli/tabs/<tabId>?workspaceId=WS
  Tab info.

DELETE /api/cli/tabs/<tabId>?workspaceId=WS
  Close the tab (kills tmux session and removes from layout).

POST /api/cli/tabs/<tabId>/send?workspaceId=WS
  Body: { "content": "..." }
  Send text (bracketed paste) to the tab.
  Response: { "status": "sent" }

GET /api/cli/tabs/<tabId>/status?workspaceId=WS
  Response: { "tabId", "workspaceId", "alive", "command", "cliState", "claudeSessionId" }

GET /api/cli/tabs/<tabId>/result?workspaceId=WS
  Capture the current pane content.
  Response: { "content": "..." }
`;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyCliToken(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  return res.status(200).send(GUIDE);
};

export default handler;
