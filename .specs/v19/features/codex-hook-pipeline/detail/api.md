# API 연동

## 1. POST /api/status/hook?provider=codex

### 엔드포인트

- **메서드**: POST
- **URL**: `http://localhost:${PORT}/api/status/hook?provider=codex&tmuxSession=<session>`
- **인증**: `x-pmux-token` 헤더 (256-bit hex) + `timingSafeEqual` + IP 필터
- **Content-Type**: `application/json`
- **호스트 바인드**: `networkAccess` 설정에 따라 `127.0.0.1` 또는 `0.0.0.0`

### Query 파라미터

| 이름 | 필수 | 비고 |
| --- | --- | --- |
| `provider` | Y | `codex` (없거나 다른 값이면 Claude default 분기) |
| `tmuxSession` | Y | hook script의 `tmux display-message -p '#S'` 결과 |

### Request body (codex stdin payload 그대로 forward)

```json
{
  "session_id": "01997fee-5078-7d32-aeb3-0b141d322a26",
  "hook_event_name": "SessionStart",
  "source": "startup",
  "transcript_path": "/Users/.../rollout-2025-09-25T17-12-28-...jsonl",
  "cwd": "/Users/.../my-project",
  "prompt": null
}
```

`hook_event_name` 종류:
- `SessionStart` — `source: 'startup' | 'resume' | 'clear'` 함께
- `UserPromptSubmit` — `prompt` 필드 포함
- `Stop`
- `PermissionRequest` — request 종류별 추가 필드 (`exec_command`, `apply_patch`, `requested_permissions`)

### Response

| 코드 | body | 의미 |
| --- | --- | --- |
| 204 | (empty) | 정상 처리 |
| 400 | `{ error: 'missing tmuxSession' }` | tmuxSession 누락 |
| 403 | `{ error: 'forbidden' }` | 토큰 검증 실패 또는 IP 차단 |
| 405 | `{ error: 'method not allowed' }` | POST 외 |
| 500 | `{ error: 'internal' }` | 서버 처리 예외 (`logger.error` 동시 발생) |

### 처리 핸들러 (`pages/api/status/hook.ts`)

```ts
const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!verifyCliToken(req)) return res.status(403).json({ error: 'forbidden' });
  if (!isRequestAllowed(req)) return res.status(403).json({ error: 'forbidden' });
  const provider = (req.query.provider as string) || 'claude';
  if (provider === 'codex') return handleCodexHook(req, res);
  return handleClaudeHook(req, res);  // backward compat: provider 없으면 default
};
```

## 2. handleCodexHook 내부 로직

```ts
const handleCodexHook = async (req, res) => {
  const tmuxSession = req.query.tmuxSession as string;
  if (!tmuxSession) return res.status(400).json({ error: 'missing tmuxSession' });

  const payload = req.body;
  const entry = statusManager.getEntry(tmuxSession);
  if (!entry) return res.status(204).end();  // 알 수 없는 세션 — 침묵

  // 메타 갱신
  entry.agentProviderId = 'codex';
  entry.agentSessionId = payload.session_id;
  if (payload.transcript_path) entry.jsonlPath = payload.transcript_path;
  if (payload.hook_event_name === 'UserPromptSubmit' && payload.prompt) {
    entry.lastUserMessage = payload.prompt;
    entry.agentSummary = payload.prompt.slice(0, 80);
  }

  // helper로 표준 이벤트 변환
  const event = translateCodexHookEvent(payload);

  if (event?.type === 'session-start') {
    const source = payload.source as 'startup' | 'resume' | 'clear';
    if (source === 'clear') {
      entry.agentSummary = null;
      entry.lastUserMessage = null;
      entry.lastAssistantMessage = null;
      statusManager.updateTabFromHook(tmuxSession, 'session-start');
    } else if (entry.cliState === 'inactive' || entry.cliState === 'unknown') {
      statusManager.updateTabFromHook(tmuxSession, 'session-start');
    }
  } else if (event?.type) {
    statusManager.updateTabFromHook(tmuxSession, event.type);
  }

  // hook 채널 emit (codex provider watchSessions가 listen)
  const g = globalThis as unknown as { __ptCodexHookEvents?: EventEmitter };
  g.__ptCodexHookEvents?.emit('session-info', tmuxSession, {
    status: 'running',
    sessionId: payload.session_id,
    jsonlPath: payload.transcript_path ?? null,
    pid: null,
    cwd: payload.cwd ?? null,
    startedAt: null,
  });

  res.status(204).end();
};
```

## 3. translateCodexHookEvent helper (`providers/codex/work-state-observer.ts`)

```ts
export const translateCodexHookEvent = (payload: any): TAgentWorkStateEvent | null => {
  switch (payload.hook_event_name) {
    case 'SessionStart':
      return { type: 'session-start' };  // source 분기는 호출자가 처리
    case 'UserPromptSubmit':
      return { type: 'prompt-submit' };
    case 'Stop':
      return { type: 'stop' };
    case 'PermissionRequest':
      return { type: 'notification', notificationType: 'permission-request' };
    default:
      return null;
  }
};
```

## 4. globalThis 모듈 격리 (CLAUDE.md rule 18)

```ts
// status-manager.ts (또는 신설 모듈)
const g = globalThis as unknown as { __ptCodexHookEvents?: EventEmitter };
if (!g.__ptCodexHookEvents) g.__ptCodexHookEvents = new EventEmitter();
export const codexHookEvents = g.__ptCodexHookEvents;
```

`__pt` prefix + 가드 패턴 — HMR/multi-graph 안전.

## 5. hook script (`~/.purplemux/codex-hook.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail
SESSION="$(tmux display-message -p '#S' 2>/dev/null || echo '')"
TOKEN="$(cat ~/.purplemux/cli-token 2>/dev/null || echo '')"
PORT="$(cat ~/.purplemux/port 2>/dev/null || echo '8022')"
cat | curl -sS -X POST \
  -H "x-pmux-token: ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "http://localhost:${PORT}/api/status/hook?provider=codex&tmuxSession=${SESSION}" >/dev/null 2>&1 || true
```

- mode 0700, 부트 시 매번 write (auto-managed)
- 외부 의존: `tmux`, `curl` (시스템 기본 — jq 등 회피)
- 모든 에러 silent — codex 본체에 영향 차단

## 6. 사용자 config.toml 머지 결과 직렬화

```toml
# -c hooks.SessionStart=
[
  {matcher=".*", hooks=[{type="command", command="~/.purplemux/codex-hook.sh"}]},
  # 사용자 entry들 — 원본 보존
]
```

- 직렬화: SDK의 `toTomlValue` 패턴 (`JSON.stringify`로 escape) + shellQuote 단일따옴표 wrap
- triple-quoted literal (`'''...'''`) 사용 — `"`/`\` escape 회피
- prompt 내용 내 `'''` 발견 시 sanitize (`'''` → `''<zwnj>'`)

## 7. 캐싱 전략

| 데이터 | 캐시 위치 | 무효화 |
| --- | --- | --- |
| 사용자 `config.toml` 파싱 결과 | 파일 시스템 (mtime watch) | 사용자 편집 시 fs.watch 트리거 |
| 머지된 hook config TOML 직렬화 | 매 launch 재계산 (사용자 편집 즉시 반영) | N/A |
| hook script 내용 | 부트 시 1회 write — 메모리 캐시 불필요 | 코드 업데이트 시 재배포 |

## 8. 실시간 업데이트

| 이벤트 | 채널 | 수신자 |
| --- | --- | --- |
| codex hook payload 도착 | `globalThis.__ptCodexHookEvents.emit('session-info', ...)` | codex provider `watchSessions` callback |
| jsonlPath 변경 (clear/resume) | timeline-server `subscribe(newPath)` + `timeline:session-changed` 발사 | 클라이언트 timeline-view |
| cliState 전환 | sync-server WebSocket `tab:status` push | 모든 클라이언트 (탭 인디케이터) |

## 9. 페이지네이션 / 정렬 / 필터

- 본 endpoint는 단일 이벤트 receive — 해당 없음
