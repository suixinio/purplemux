# API 연동

## 조회 API

### 채팅 이력 조회

- **엔드포인트**: `GET /api/agent/[agentId]/chat`
- **파라미터**:
  - `sessionId?` — 미지정 시 최신 세션
  - `limit?` — 기본 50
  - `before?` — 커서 (메시지 id), 무한 스크롤용
- **응답**: `IChatHistoryResponse`
- **캐시 전략**: 캐시 없음 (최신 데이터 필수)

### 에이전트 상태 조회

- **소스**: WebSocket `/api/agent-status` → `agent:status` 이벤트
- **사용처**: 채팅 헤더 상태 뱃지, 타이핑 인디케이터, 입력 비활성화

## 변경 API

### 메시지 전송

- **엔드포인트**: `POST /api/agent/[agentId]/send`
- **바디**: `{ content: string }`
- **응답**: `{ id, status: 'sent' | 'queued' }`
- **Optimistic UI**: 사용자 말풍선 즉시 표시
  - `status: 'sent'` → 정상
  - `status: 'queued'` → 말풍선에 "큐잉됨" 표시 (회색 시계 아이콘)
- **실패 시**: 말풍선에 재전송 버튼 표시

### approval 응답

- **엔드포인트**: `POST /api/agent/[agentId]/send`
- **바디**: `{ content: '승인' }` 또는 `{ content: '거부' }`
- **Optimistic UI**: 버튼 → 결과 텍스트 전환
- approval은 일반 메시지 전송과 같은 엔드포인트 사용

## WebSocket — 실시간 메시지

### 연결

- `/api/agent-status` WebSocket (전역 — agent-management와 공유)
- 채팅 페이지에서는 `agent:message` 이벤트를 추가로 구독

### 수신 이벤트

```typescript
// 에이전트 메시지 수신
interface IAgentChatMessage {
  type: 'agent:message';
  agentId: string;
  message: IChatMessage;
}

// 에이전트 상태 변경
interface IAgentStatusUpdate {
  type: 'agent:status';
  agentId: string;
  status: TAgentStatus;
}
```

### 메시지 수신 처리

```
agent:message 수신
  ├── agentId 일치 → messages 배열에 추가
  └── agentId 불일치 → 무시 (다른 에이전트)
```

## 클라이언트 상태 관리

### 채팅 로컬 상태 (useState/useReducer)

```typescript
interface IChatState {
  messages: IChatMessage[];
  hasMore: boolean;
  isLoading: boolean;          // 초기 로딩
  isLoadingMore: boolean;      // 무한 스크롤 로딩
  isSending: boolean;          // 메시지 전송 중
  isAtBottom: boolean;         // 자동 스크롤 여부
}
```

페이지 로컬 상태로 관리 (전역 스토어 불필요 — 채팅은 페이지 단위).

### 에이전트 상태 (전역 — useAgentStore)

- `status` — 타이핑 인디케이터, 입력 비활성화에 사용
- agent-management의 useAgentStore 재사용

## 컴포넌트 구조

```
pages/agents/[agentId]/chat.tsx
├── ChatHeader                  ← 에이전트 정보 + 상태
├── MessageList                 ← 메시지 목록 (가상 스크롤 고려)
│   ├── DateSeparator           ← 날짜 구분선
│   ├── ChatBubble              ← 개별 메시지 말풍선
│   │   └── ApprovalActions     ← approval 버튼 (조건부)
│   ├── TypingIndicator         ← 타이핑 인디케이터 (조건부)
│   └── NewMessageButton        ← 새 메시지 플로팅 버튼 (조건부)
└── ChatInput                   ← 입력 영역
```

## 파일 구조

```
src/
├── pages/agents/
│   └── [agentId]/
│       └── chat.tsx              # 채팅 페이지
├── components/features/agent/
│   ├── chat-header.tsx
│   ├── message-list.tsx
│   ├── chat-bubble.tsx
│   ├── approval-actions.tsx
│   ├── typing-indicator.tsx
│   ├── new-message-button.tsx
│   └── chat-input.tsx
└── hooks/
    └── use-agent-chat.ts         # 채팅 상태 + WebSocket 메시지 구독
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| 이력 조회 실패 | 에러 메시지 + 재시도 버튼 |
| 메시지 전송 실패 | 말풍선에 재전송 버튼 |
| WebSocket 끊김 | 상단 배너 + 자동 재연결 |
| 재연결 후 동기화 | GET /api/agent/{agentId}/chat로 누락 메시지 보충 |
