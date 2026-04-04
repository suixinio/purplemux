# API 연동

## 에이전트 CRUD

### POST /api/agent — 에이전트 생성

```typescript
// Request
interface ICreateAgentRequest {
  name: string;
  role: string;
  projects: string[];       // 워크스페이스 경로 배열
}

// Response 201
interface ICreateAgentResponse {
  id: string;
  name: string;
  role: string;
  projects: string[];
  status: TAgentStatus;
}
```

부수 효과:
- `~/.purplemux/agents/{id}/config.md` 생성
- `~/.purplemux/agents/{id}/chat/index.json` 초기화
- tmux 세션 생성 + Claude Code 실행

### GET /api/agent — 에이전트 목록

```typescript
// Response 200
interface IAgentListResponse {
  agents: Array<{
    id: string;
    name: string;
    role: string;
    projects: string[];
    status: TAgentStatus;
  }>;
}
```

### GET /api/agent/[agentId] — 에이전트 상세

```typescript
// Response 200
interface IAgentDetailResponse {
  id: string;
  name: string;
  role: string;
  projects: string[];
  status: TAgentStatus;
  createdAt: string;
}
```

### PATCH /api/agent/[agentId] — 에이전트 설정 수정

```typescript
// Request
interface IUpdateAgentRequest {
  name?: string;
  role?: string;
  projects?: string[];
}

// Response 200 — 수정된 에이전트 정보
```

부수 효과: config.md 갱신

### DELETE /api/agent/[agentId] — 에이전트 삭제

```typescript
// Response 204
```

부수 효과:
- tmux 세션 kill
- `~/.purplemux/agents/{id}/` 디렉토리 삭제

## 메시지 송수신

### POST /api/agent/[agentId]/send — 사용자 → 에이전트 메시지 전송

```typescript
// Request
interface ISendMessageRequest {
  content: string;
}

// Response 200
interface ISendMessageResponse {
  id: string;
  status: 'sent' | 'queued';    // idle → sent, busy → queued
}
```

부수 효과:
- JSONL에 기록
- idle이면 tmux send-keys

### POST /api/agent/message — 에이전트 → 사용자 메시지 수신

에이전트 Claude Code 세션이 curl로 호출하는 엔드포인트.

```typescript
// Request
interface IAgentMessageRequest {
  agentId: string;
  type: 'report' | 'question' | 'done' | 'error' | 'approval';
  content: string;
  metadata?: Record<string, unknown>;
}

// Response 200
interface IAgentMessageResponse {
  id: string;
  received: true;
}
```

부수 효과:
- JSONL에 기록
- WebSocket broadcast

### GET /api/agent/[agentId]/chat — 채팅 이력 조회

```typescript
// Query params
interface IChatHistoryQuery {
  sessionId?: string;       // 미지정 시 최신 세션
  limit?: number;           // 기본 50
  before?: string;          // cursor (메시지 id) — 이전 메시지 로드용
}

// Response 200
interface IChatHistoryResponse {
  sessionId: string;
  messages: IChatMessage[];
  hasMore: boolean;
}
```

캐시 전략: 캐시 없음 (JSONL append-only, 항상 최신)

## WebSocket — /api/agent-status

에이전트 상태 변경을 실시간 push.

### 서버 → 클라이언트

```typescript
// 전체 동기화 (연결 시)
interface IAgentStatusSync {
  type: 'agent:sync';
  agents: Array<{
    id: string;
    name: string;
    status: TAgentStatus;
  }>;
}

// 개별 상태 변경
interface IAgentStatusUpdate {
  type: 'agent:status';
  agentId: string;
  status: TAgentStatus;
}

// 채팅 메시지 push
interface IAgentChatMessage {
  type: 'agent:message';
  agentId: string;
  message: IChatMessage;
}
```

## 타입 정의

```typescript
type TAgentStatus = 'idle' | 'working' | 'blocked' | 'offline';
```

## 에러 처리

| 상황 | HTTP | 응답 |
|------|------|------|
| 에이전트 없음 | 404 | `{ error: 'Agent not found' }` |
| 이름 중복 | 409 | `{ error: 'Agent name already exists' }` |
| 세션 생성 실패 | 500 | `{ error: 'Failed to create agent session' }` |
| 메시지 큐 초과 | 429 | `{ error: 'Message queue full' }` |

## 파일 구조

```
src/
├── pages/api/
│   ├── agent/
│   │   ├── index.ts                # GET (목록), POST (생성)
│   │   ├── [agentId]/
│   │   │   ├── index.ts            # GET (상세), PATCH (수정), DELETE (삭제)
│   │   │   ├── send.ts             # POST (메시지 전송)
│   │   │   └── chat.ts             # GET (이력 조회)
│   │   └── message.ts              # POST (에이전트 → 사용자)
├── lib/
│   ├── agent-manager.ts            # 에이전트 라이프사이클 관리
│   ├── agent-chat.ts               # 채팅 메시지 JSONL 읽기/쓰기
│   └── agent-status-server.ts      # WebSocket 핸들러
└── types/
    └── agent.ts                    # 에이전트 관련 타입
```
