# API 연동

## 탭 제어 API

에이전트 Brain이 curl로 호출하는 HTTP API. localhost only, proxy 인증 제외.

### POST /api/agent/[agentId]/tab — 탭 생성

```typescript
// Request
interface ICreateTabRequest {
  workspaceId: string;        // 대상 워크스페이스 ID
  taskTitle?: string;         // 태스크 제목 (옵션 — UI 표시용)
}

// Response 201
interface ICreateTabResponse {
  tabId: string;
  workspaceId: string;
  tmuxSession: string;        // pt-{wsId}-{paneId}-{tabId}
}
```

부수 효과:
- 워크스페이스의 레이아웃에 새 탭 추가 (기존 `layout-store.ts` API)
- tmux 세션 생성 (`createSession`)
- Claude Code 실행 (`sendKeys` + trust 프롬프트 자동 승인)
- 탭 매핑 등록 (인메모리 + `tabs.json`)
- WebSocket broadcast: `workspace:tab-added`

에러:
| 상황 | HTTP | 응답 |
|------|------|------|
| 에이전트 없음 | 404 | `{ error: "Agent not found" }` |
| 워크스페이스 없음 | 400 | `{ error: "Workspace not found", available: [...] }` |
| 동시 탭 제한 초과 | 429 | `{ error: "Max concurrent tabs reached", limit: 5 }` |
| tmux 세션 생성 실패 | 500 | `{ error: "Failed to create tab session" }` |

### POST /api/agent/[agentId]/tab/[tabId]/send — 탭에 메시지 전송

```typescript
// Request
interface ITabSendRequest {
  content: string;            // Claude Code에 전달할 지시
}

// Response 200
interface ITabSendResponse {
  status: 'sent' | 'queued';
}
```

부수 효과:
- idle이면 `tmux send-keys`로 즉시 전달
- busy이면 탭별 메시지 큐에 추가 (최대 5개)
- 상태 감지로 idle 전환 시 큐 drain

에러:
| 상황 | HTTP | 응답 |
|------|------|------|
| 탭 없음 | 404 | `{ error: "Tab not found" }` |
| 탭 소유권 불일치 | 403 | `{ error: "Tab not owned by this agent" }` |
| 세션 죽음 | 410 | `{ error: "Tab session is dead" }` |

### GET /api/agent/[agentId]/tab/[tabId]/status — 탭 상태 조회

```typescript
// Response 200
interface ITabStatusResponse {
  tabId: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  lastActivity?: string;      // ISO 8601 — 마지막 상태 변경 시각
}
```

상태 산출 로직:
1. `hasSession()` → false이면 `error`
2. `getSessionPanePid()` → `detectActiveSession()`
3. Claude running + busy → `working`
4. Claude running + idle + `.task-result.md` 존재 → `completed`
5. Claude running + idle → `idle`
6. Claude not-running → shell 복귀 (완료 또는 에러)

### GET /api/agent/[agentId]/tab/[tabId]/result — 탭 결과 읽기

```typescript
// Response 200
interface ITabResultResponse {
  content: string;            // 결과 텍스트
  source: 'file' | 'jsonl' | 'buffer';
}
```

읽기 우선순위:
1. **file** — 탭 작업 디렉토리의 `.task-result.md`
2. **jsonl** — Claude Code 세션 jsonl의 마지막 assistant 메시지 (tail 8KB 파싱)
3. **buffer** — `tmux capture-pane` (tail 50줄)

에러:
| 상황 | HTTP | 응답 |
|------|------|------|
| 결과 없음 | 404 | `{ error: "No result available" }` |
| 탭 아직 working | 409 | `{ error: "Tab is still working" }` |

### DELETE /api/agent/[agentId]/tab/[tabId] — 탭 닫기

```typescript
// Response 204
```

부수 효과:
- tmux 세션 kill (`killSession`)
- 탭 매핑 삭제 (인메모리 + `tabs.json`)
- 워크스페이스 레이아웃에서 탭 제거
- WebSocket broadcast: `workspace:tab-removed`

## 탭 완료 알림 (서버 → 에이전트)

서버가 폴링으로 탭 상태 변경 감지 시 에이전트 Brain 세션에 알림.

### 완료 알림

```
tmux send-keys agent-{agentId}:
[TAB_COMPLETE] tabId={tabId} status=completed
```

### 에러 알림

```
tmux send-keys agent-{agentId}:
[TAB_ERROR] tabId={tabId} status=error reason={brief_reason}
```

에이전트 CLAUDE.md에 이 형식을 파싱하는 규칙 명시.

## WebSocket 이벤트

기존 `agent-status` WebSocket에 탭 관련 이벤트 추가.

```typescript
// 탭 생성
interface IWorkspaceTabAdded {
  type: 'workspace:tab-added';
  agentId: string;
  workspaceId: string;
  tab: IAgentTab;
}

// 탭 상태 변경
interface IWorkspaceTabUpdated {
  type: 'workspace:tab-updated';
  agentId: string;
  tabId: string;
  status: TAgentTabStatus;
}

// 탭 제거
interface IWorkspaceTabRemoved {
  type: 'workspace:tab-removed';
  agentId: string;
  tabId: string;
}
```

## proxy 인증 제외

에이전트 탭 제어 API는 localhost curl 전용이므로 인증 미들웨어 제외.

```typescript
// proxy.ts matcher에 추가
'api/agent/[^/]+/tab'  // 탭 제어 API 전체
```

단, API 내부에서 localhost 여부 검증 (기존 relay API와 동일 패턴):

```typescript
const isLocalRequest = (req) => {
  const host = req.headers.host || '';
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
};
```

## 파일 구조

```
src/
├── pages/api/agent/
│   └── [agentId]/
│       └── tab/
│           ├── index.ts              # POST (탭 생성)
│           └── [tabId]/
│               ├── index.ts          # DELETE (탭 닫기)
│               ├── send.ts           # POST (메시지 전송)
│               ├── status.ts         # GET (상태 조회)
│               └── result.ts         # GET (결과 읽기)
├── lib/
│   └── agent-manager.ts             # 탭 매핑 관리 + 모니터링 로직 추가
└── types/
    └── agent.ts                     # IAgentTab, TAgentTabStatus 등
```

## 캐싱 / 실시간 전략

| 항목 | 전략 |
|------|------|
| 탭 상태 | 캐시 없음 — 5초 폴링으로 최신 상태 유지 |
| 탭 결과 | 캐시 없음 — 요청 시 파일/jsonl 직접 읽기 |
| 탭 목록 | 인메모리 + tabs.json 동기화 (서버 재시작 복원) |
| WebSocket | 상태 변경 즉시 broadcast (폴링 보완) |
