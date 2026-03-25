# API 연동

## 개요

이 feature는 별도 REST API 없이, 기존 JSONL 파싱 → WebSocket 브로드캐스트 파이프라인을 그대로 활용한다. 새로운 엔드포인트나 통신 채널이 필요 없다.

## 파서 수정 (`lib/session-parser.ts`)

### 수정 위치

`parseSingleEntry()` → assistant 타입 → tool_use 순회 부분.

현재 코드에서 `ExitPlanMode`, `AskUserQuestion`을 특별 처리하는 것과 같은 패턴으로 `TaskCreate`/`TaskUpdate` 분기를 추가한다.

### 수정 로직

```typescript
// parseSingleEntry() 내부, tool_use 처리 분기

if (toolName === 'TaskCreate') {
  entries.push({
    id: nanoid(),
    type: 'task-progress',
    timestamp,
    action: 'create',
    taskId: '',
    subject: typeof input.subject === 'string' ? input.subject : '',
    description: typeof input.description === 'string' ? input.description : undefined,
    status: 'pending',
  } satisfies ITimelineTaskProgress);
} else if (toolName === 'TaskUpdate') {
  entries.push({
    id: nanoid(),
    type: 'task-progress',
    timestamp,
    action: 'update',
    taskId: typeof input.taskId === 'string' ? input.taskId : String(input.taskId ?? ''),
    status: (input.status === 'in_progress' || input.status === 'completed')
      ? input.status
      : 'pending',
  } satisfies ITimelineTaskProgress);
} else if (toolName === 'ExitPlanMode' && ...) {
  // 기존 로직
}
```

### 기존 파이프라인 재사용

| 단계 | 함수 | 변경 |
|------|------|------|
| 파싱 | `parseSingleEntry()` | TaskCreate/TaskUpdate 분기 추가 |
| 결과 병합 | `mergeToolResults()` | 변경 없음 — task-progress에 toolUseId 없으므로 무시 |
| 초기 로드 | `parseSessionFile()` → `parseContent()` | 변경 없음 |
| 증분 파싱 | `parseIncremental()` | 변경 없음 |
| 브로드캐스트 | `broadcastToWatcher()` | 변경 없음 — 모든 엔트리 타입 전달 |
| WS 메시지 | `timeline:init`, `timeline:append` | 변경 없음 — entries 배열에 포함 |

## 타입 파일 수정 (`types/timeline.ts`)

```typescript
// 추가
export type TTaskStatus = 'pending' | 'in_progress' | 'completed';

export interface ITaskItem {
  taskId: string;
  subject: string;
  description?: string;
  status: TTaskStatus;
}

export interface ITimelineTaskProgress {
  id: string;
  type: 'task-progress';
  timestamp: number;
  action: 'create' | 'update';
  taskId: string;
  subject?: string;
  description?: string;
  status: TTaskStatus;
}

// 수정
export type TTimelineEntryType =
  | 'user-message'
  | 'assistant-message'
  | 'tool-call'
  | 'tool-result'
  | 'agent-group'
  | 'task-notification'
  | 'task-progress'      // 추가
  | 'plan'
  | 'ask-user-question'
  | 'interrupt'
  | 'session-exit'
  | 'turn-end';

export type ITimelineEntry =
  | ITimelineUserMessage
  | ITimelineAssistantMessage
  | ITimelineToolCall
  | ITimelineToolResult
  | ITimelineAgentGroup
  | ITimelineTaskNotification
  | ITimelineTaskProgress    // 추가
  | ITimelinePlan
  | ITimelineAskUserQuestion
  | ITimelineInterrupt
  | ITimelineSessionExit
  | ITimelineTurnEnd;
```

## 파일 구조

```
src/
├── types/
│   └── timeline.ts           ← 수정: ITaskItem, ITimelineTaskProgress, TTaskStatus 추가
└── lib/
    └── session-parser.ts     ← 수정: TaskCreate/TaskUpdate 분기 추가
```
