# API 연동

## 조회 API

### 에이전트 목록 조회

- **엔드포인트**: `GET /api/agent`
- **파라미터**: 없음
- **응답**: `IAgentListResponse` (agent-relay-server/api.md 참조)
- **캐시 전략**: 캐시 없음 — WebSocket으로 실시간 상태 동기화

### 에이전트 상세 조회

- **엔드포인트**: `GET /api/agent/[agentId]`
- **응답**: `IAgentDetailResponse`

## 변경 API

### 에이전트 생성

- **엔드포인트**: `POST /api/agent`
- **바디**: `ICreateAgentRequest`
- **Optimistic UI**: 카드 즉시 추가 (offline 상태), 실패 시 롤백
- **성공 후**: `/agents/{agentId}/chat`로 이동

### 에이전트 수정

- **엔드포인트**: `PATCH /api/agent/[agentId]`
- **바디**: `IUpdateAgentRequest`
- **Optimistic UI**: 없음 (Sheet에서 처리, 성공 시 toast)

### 에이전트 삭제

- **엔드포인트**: `DELETE /api/agent/[agentId]`
- **Optimistic UI**: 카드 fade-out, 실패 시 롤백

## WebSocket — 실시간 상태

- **엔드포인트**: `/api/agent-status` (agent-relay-server 참조)
- **연결 시점**: `/agents` 페이지 마운트 시
- **수신 이벤트**:
  - `agent:sync` — 전체 에이전트 상태 동기화
  - `agent:status` — 개별 상태 변경 (뱃지 즉시 갱신)

## 헤더 뱃지 데이터

- WebSocket `agent:sync` / `agent:status`에서 `blocked` 상태 에이전트 수 집계
- 전역 Zustand 스토어에 저장 — 모든 페이지에서 접근

## 클라이언트 상태 관리

### useAgentStore (Zustand)

```typescript
interface IAgentStore {
  agents: Record<string, IAgent>;
  fetchAgents: () => Promise<void>;
  createAgent: (req: ICreateAgentRequest) => Promise<string>;
  updateAgent: (id: string, req: IUpdateAgentRequest) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  syncFromServer: (agents: IAgent[]) => void;
  updateStatus: (id: string, status: TAgentStatus) => void;
  blockedCount: () => number;
}
```

## 파일 구조

```
src/
├── pages/
│   └── agents/
│       └── index.tsx                 # 에이전트 목록 페이지
├── components/features/agent/
│   ├── agent-card.tsx                # 에이전트 카드
│   ├── agent-create-dialog.tsx       # 생성 다이얼로그
│   ├── agent-settings-sheet.tsx      # 설정 시트
│   └── agent-delete-dialog.tsx       # 삭제 확인 다이얼로그
├── hooks/
│   ├── use-agent-store.ts            # Zustand 스토어
│   └── use-agent-status.ts           # WebSocket 연결 훅
└── types/
    └── agent.ts                      # 공유 타입 (relay-server와 동일)
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| 목록 조회 실패 | 스켈레톤 → 에러 메시지 + 재시도 버튼 |
| 생성 실패 | Optimistic 롤백 + toast.error |
| 수정 실패 | Sheet 유지 + toast.error |
| 삭제 실패 | 카드 복원 + toast.error |
| WebSocket 연결 끊김 | 자동 재연결 (3초 간격, 최대 5회) |
