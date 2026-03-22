# API 연동

## 개요

status-server는 REST API 없이 WebSocket 기반으로 동작한다. 서버가 모든 탭의 상태를 감시하고, WebSocket으로 클라이언트에 push한다.

## WebSocket 엔드포인트

### ws://localhost:{PORT}/api/status

글로벌 Claude 상태 전용 WebSocket. 기존 타임라인 WebSocket(`/api/timeline`)과 별도 연결.

## Server → Client 이벤트

### status:sync

초기 접속 시 전체 탭 상태를 일괄 전송한다.

```json
{
  "type": "status:sync",
  "tabs": {
    "tab-abc123": { "cliState": "busy", "dismissed": false, "workspaceId": "ws-1", "tabName": "api-server" },
    "tab-def456": { "cliState": "idle", "dismissed": false, "workspaceId": "ws-1", "tabName": "frontend" },
    "tab-ghi789": { "cliState": "inactive", "dismissed": true, "workspaceId": "ws-2", "tabName": "docs" }
  }
}
```

- WebSocket 연결 직후 자동 전송
- 재접속 시에도 동일하게 전체 상태 재전송

### status:update

개별 탭 상태 변경 시 push한다.

```json
{
  "type": "status:update",
  "tabId": "tab-abc123",
  "cliState": "idle",
  "dismissed": false,
  "workspaceId": "ws-1",
  "tabName": "api-server"
}
```

- 상태가 실제로 변경되었을 때만 전송 (동일 상태 재전송 방지)
- 탭 삭제 시: `cliState: null`로 전송 → 클라이언트에서 엔트리 제거

## Client → Server 이벤트

### status:tab-dismissed

사용자가 탭을 방문(확인)했을 때 전송한다.

```json
{
  "type": "status:tab-dismissed",
  "tabId": "tab-def456"
}
```

서버 처리:
1. 해당 탭의 `dismissed = true` 설정
2. 다른 연결된 클라이언트에 `status:update` broadcast
3. 보낸 클라이언트에는 재전송하지 않음 (이미 optimistic 반영)

### status:tab-active-report

활성 탭의 cliState 변경을 서버에 보고한다.

```json
{
  "type": "status:tab-active-report",
  "tabId": "tab-abc123",
  "cliState": "busy"
}
```

서버 처리:
1. 해당 탭 상태 갱신
2. 상태 전이 로직 적용:
   - `busy` → `idle` 전환 시: `dismissed = false` 설정 (needs-attention 발생)
   - `inactive` → `busy` 전환 시: `dismissed = false` 설정
3. 변경 시 다른 클라이언트에 `status:update` broadcast

## 서버 상태 매니저

### StatusManager 클래스

```typescript
interface ITabStatus {
  cliState: TCliState;
  dismissed: boolean;
  workspaceId: string;
  tabName: string;
  tmuxSession: string;
}

class StatusManager {
  private tabs: Map<string, ITabStatus>;
  private pollingTimer: NodeJS.Timeout | null;
  private clients: Set<WebSocket>;

  // 초기화
  init(): Promise<void>;          // 레이아웃 파일에서 탭 목록 로드 + 초기 스캔

  // 폴링
  startPolling(): void;           // 5~10초 주기 폴링 시작
  stopPolling(): void;
  poll(): Promise<void>;          // 전체 탭 일괄 스캔 + diff broadcast

  // 상태 관리
  getAll(): Record<string, ITabStatus>;
  updateTab(tabId: string, update: Partial<ITabStatus>): void;
  dismissTab(tabId: string): void;
  removeTab(tabId: string): void;

  // 클라이언트 관리
  addClient(ws: WebSocket): void;
  removeClient(ws: WebSocket): void;
  broadcast(event: object, exclude?: WebSocket): void;
}
```

### 싱글턴

```typescript
// lib/status-manager.ts
let instance: StatusManager | null = null;

export const getStatusManager = (): StatusManager => {
  if (!instance) {
    instance = new StatusManager();
  }
  return instance;
};
```

## 클라이언트 훅

### useClaudeStatus

WebSocket 연결 + 스토어 초기화를 담당하는 훅.

```typescript
interface IUseClaudeStatusReturn {
  getTabStatus: (tabId: string) => TTabDisplayStatus;
  getWorkspaceStatus: (wsId: string) => { busyCount: number; attentionCount: number };
  getGlobalStatus: () => { busyCount: number; attentionCount: number };
  dismissTab: (tabId: string) => void;
  reportActiveTab: (tabId: string, cliState: TCliState) => void;
}
```

내부 동작:
- 마운트 시 WebSocket 연결 (`/api/status`)
- `status:sync` → 스토어 전체 갱신
- `status:update` → 스토어 개별 갱신
- 언마운트 시 WebSocket 정리
- 연결 끊김 시 자동 재접속 (exponential backoff)

## 컴포넌트 구조

```
App (최상위)
└── ClaudeStatusProvider (신규)
    ├── useClaudeStatus 훅 → WebSocket 연결 + 스토어 초기화
    └── children (기존 앱 트리)
```

## 파일 구조

```
src/
├── lib/
│   └── status-manager.ts              ← 신규: 서버 상태 매니저 (싱글턴)
├── hooks/
│   ├── use-claude-status.ts           ← 신규: WebSocket 연결 + 스토어 훅
│   └── use-claude-status-store.ts     ← 신규: Zustand 스토어
├── pages/api/
│   └── status.ts                      ← 신규: WebSocket 업그레이드 핸들러
└── types/
    └── status.ts                      ← 신규: 상태 관련 타입
```

## 에러 처리

| 에러 | 처리 |
|---|---|
| WebSocket 연결 실패 | exponential backoff 재접속 (1s→2s→4s, max 30s) |
| tmux 세션 조회 실패 | 해당 탭 → inactive, console.warn |
| 레이아웃 파일 없음 | 빈 탭 목록으로 시작, 이후 탭 생성 시 등록 |
| 폴링 중 에러 | 해당 주기 스킵, 다음 주기에 재시도, console.error |
| 클라이언트에서 잘못된 이벤트 | 무시 (console.warn) |
