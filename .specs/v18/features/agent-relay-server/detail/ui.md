# 화면 구성

## 개요

agent-relay-server는 백엔드 모듈로 직접적인 UI가 없다. 다만 디버깅/운영용 상태 확인 인터페이스를 정의한다.

## 에이전트 상태 데이터 모델

### config.md 구조

```markdown
---
name: backend-bot
role: 백엔드 개발
projects:
  - /Users/user/project-a
  - /Users/user/project-b
autonomy: conservative
createdAt: 2026-04-04T00:00:00Z
---
```

### 에이전트 상태 산출

| 조건 | 상태 | 설명 |
|------|------|------|
| tmux 세션 없음 | `offline` | 세션 미생성 또는 죽음 |
| 세션 존재 + idle 감지 | `idle` | 입력 대기 중 |
| 세션 존재 + busy 감지 | `working` | 작업 실행 중 |
| `question` 메시지 전송 후 응답 없음 | `blocked` | 사용자 응답 대기 |

### 채팅 메시지 스키마

```typescript
interface IChatMessage {
  id: string;
  timestamp: string;       // ISO 8601
  role: 'user' | 'agent';
  type: 'text' | 'report' | 'question' | 'done' | 'error' | 'approval';
  content: string;
  metadata?: Record<string, unknown>;
}
```

### index.json 스키마

```typescript
interface IChatIndex {
  sessions: Array<{
    id: string;
    agentId: string;
    createdAt: string;
    lastMessageAt: string;
    missionId?: string;       // Phase 2
  }>;
}
```

## 파일 구조

```
~/.purplemux/agents/
├── {agentId}/
│   ├── config.md             # 에이전트 설정
│   └── chat/
│       ├── index.json        # 세션 목록
│       └── {sessionId}.jsonl # 메시지 (append-only)
```
