# API 연동

## 1. ITimelineEntry 8개 신규 타입 (`types/timeline.ts`)

```ts
// 기존 13개 type union에 추가
type TTimelineEntryType =
  | 'user-message'
  | 'assistant-message'
  | 'thinking'
  | 'tool-call'
  | 'tool-result'
  | 'agent-group'
  | 'task-progress'
  | 'task-notification'
  | 'plan'
  | 'ask-user-question'
  | 'interrupt'
  | 'session-exit'
  | 'turn-end'
  // 신규
  | 'approval-request'
  | 'exec-command-stream'
  | 'web-search'
  | 'mcp-tool-call'
  | 'patch-apply'
  | 'context-compacted'
  | 'reasoning-summary'  // Codex 전용
  | 'error-notice';      // Codex 전용
```

## 2. 신규 entry interface

```ts
interface ITimelineApprovalRequest {
  id: string;
  type: 'approval-request';
  timestamp: number;
  callId: string;
  requestType: 'exec' | 'apply-patch' | 'permission';
  command?: string;
  cwd?: string;
  patches?: Array<{ path: string; operation: string; diff?: string }>;
  permissions?: string[];
  outcome?: 'approved' | 'denied';  // 응답 후 채워짐
}

interface ITimelineExecCommandStream {
  id: string;
  type: 'exec-command-stream';
  timestamp: number;
  callId: string;
  command: string;
  cwd?: string;
  stdout: string;
  stdoutTruncated?: boolean;
  exitCode: number;
  durationMs: number;
}

interface ITimelineWebSearch {
  id: string;
  type: 'web-search';
  timestamp: number;
  callId: string;
  query: string;
  results: Array<{ title: string; url: string; snippet?: string }>;
}

interface ITimelineMcpToolCall {
  id: string;
  type: 'mcp-tool-call';
  timestamp: number;
  callId: string;
  server: string;
  tool: string;
  arguments: any;
  result: any;
}

interface ITimelinePatchApply {
  id: string;
  type: 'patch-apply';
  timestamp: number;
  callId: string;
  files: Array<{
    path: string;
    operation: 'modify' | 'create' | 'delete';
    diff?: string;
    content?: string;
  }>;
  success: boolean;
}

interface ITimelineContextCompacted {
  id: string;
  type: 'context-compacted';
  timestamp: number;
  beforeTokens: number;
  afterTokens: number;
  reductionPercent: number;
}

interface ITimelineReasoningSummary {
  id: string;
  type: 'reasoning-summary';
  timestamp: number;
  summary: string[];  // summary[]만 — encrypted_content는 미해독
  encrypted: boolean;  // true (안내 표시용)
}

interface ITimelineErrorNotice {
  id: string;
  type: 'error-notice';
  timestamp: number;
  severity: 'error' | 'warning' | 'stream-error' | 'guardian-warning';
  message: string;
  retryStatus?: string;  // stream-error 전용
  context?: string;      // 추가 컨텍스트 (옵션)
}

// 기존 ITimelineEntry union에 추가
type ITimelineEntry =
  | ITimelineUserMessage
  | ITimelineAssistantMessage
  | ITimelineThinking
  | ITimelineToolCall
  | ITimelineToolResult
  | ITimelineAgentGroup
  | ITimelineTaskProgress
  | ITimelineTaskNotification
  | ITimelinePlan
  | ITimelineAskUserQuestion
  | ITimelineInterrupt
  | ITimelineSessionExit
  | ITimelineTurnEnd
  | ITimelineApprovalRequest
  | ITimelineExecCommandStream
  | ITimelineWebSearch
  | ITimelineMcpToolCall
  | ITimelinePatchApply
  | ITimelineContextCompacted
  | ITimelineReasoningSummary
  | ITimelineErrorNotice;
```

## 3. assistant-message.usage optional 변경

```ts
interface ITimelineAssistantMessage {
  id: string;
  type: 'assistant-message';
  timestamp: number;
  text: string;
  usage?: {  // optional 변경 — Codex는 undefined
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
}
```

기존 Claude 데이터 호환 — 필드는 그대로 채워짐.

## 4. timeline-view.tsx 변경 사이트

### Import (line ~17-22)

```tsx
import { ApprovalRequestItem } from './approval-request-item';
import { ExecCommandStreamItem } from './exec-command-stream-item';
import { WebSearchItem } from './web-search-item';
import { McpToolCallItem } from './mcp-tool-call-item';
import { PatchApplyItem } from './patch-apply-item';
import { ContextCompactedItem } from './context-compacted-item';
import { ReasoningSummaryItem } from './reasoning-summary-item';
import { ErrorNoticeItem } from './error-notice-item';
```

### TimelineEntryRenderer switch (line ~134-155)

```tsx
const TimelineEntryRenderer = ({ entry }: { entry: ITimelineEntry }) => {
  switch (entry.type) {
    case 'user-message': return <UserMessageItem entry={entry} />;
    case 'assistant-message': return <AssistantMessageItem entry={entry} />;
    case 'tool-call': return <ToolCallItem entry={entry} />;
    case 'tool-result': return null;  // tool-call에서 합쳐 표시
    case 'agent-group': return <AgentGroupItem entry={entry} />;
    case 'task-progress':
    case 'task-notification': return <TaskChecklistItem entry={entry} />;
    case 'plan': return <PlanItem entry={entry} />;
    case 'ask-user-question': return <AskUserQuestionItem entry={entry} />;
    case 'interrupt': return <InterruptItem entry={entry} />;
    case 'session-exit': return <SessionExitItem entry={entry} />;
    case 'turn-end': return <TurnEndItem entry={entry} />;
    // thinking 미표시 (Claude 전용 정책)
    // 신규
    case 'approval-request': return <ApprovalRequestItem entry={entry} />;
    case 'exec-command-stream': return <ExecCommandStreamItem entry={entry} />;
    case 'web-search': return <WebSearchItem entry={entry} />;
    case 'mcp-tool-call': return <McpToolCallItem entry={entry} />;
    case 'patch-apply': return <PatchApplyItem entry={entry} />;
    case 'context-compacted': return <ContextCompactedItem entry={entry} />;
    case 'reasoning-summary': return <ReasoningSummaryItem entry={entry} />;
    case 'error-notice': return <ErrorNoticeItem entry={entry} />;
    default: return null;
  }
};
```

### groupedItems() — 변경 없음

begin/delta/end 묶음은 파서 책임.

## 5. timeline-server provider 분기

```ts
// src/lib/timeline-server.ts (변경 사이트)
const createParser = (jsonlPath: string): IParser => {
  if (jsonlPath.includes('/.codex/sessions/')) {
    return createCodexParser(jsonlPath);  // codex-jsonl-parser feature
  }
  return createClaudeParser(jsonlPath);  // 기존
};
```

WebSocket protocol 변경 없음 — output `ITimelineEntry`/`TTimelineServerMessage` 동일.

## 6. CodexPanel placeholder 제거

```tsx
// src/components/features/panels/codex-panel.tsx Phase 3
import { TimelineView } from '../timeline/timeline-view';

const CodexPanel = ({ tab, ... }) => {
  // ... 헤더, 빈 상태 등 ...
  return (
    <>
      <CodexPanelHeader ... />
      <TimelineView
        jsonlPath={tab.agentState?.jsonlPath ?? null}
        tabId={tab.id}
        // ClaudeCodePanel과 동일 props
      />
      <CodexPermissionPromptCard tabId={tab.id} ... />
      <ContextRing tabId={tab.id} />
      <WebInputBar tabId={tab.id} />
    </>
  );
};
```

ClaudeCodePanel과 props 통합 — 향후 `AgentPanel` 단일 컴포넌트 통합 가능.

## 7. WebSocket 메시지 타입

기존 그대로 — 변경 없음:

```ts
type TTimelineServerMessage =
  | { type: 'timeline:append'; entries: ITimelineEntry[] }
  | { type: 'timeline:replace'; entries: ITimelineEntry[] }
  | { type: 'timeline:session-changed'; reason: 'new-session-started' | 'jsonl-replaced' };
```

## 8. 컴포넌트 props 시그니처

각 신규 컴포넌트는 단일 entry prop만 받음:

```tsx
interface IItemProps<T extends ITimelineEntry> {
  entry: T;
}

const ApprovalRequestItem: React.FC<IItemProps<ITimelineApprovalRequest>> = ({ entry }) => { ... };
const ExecCommandStreamItem: React.FC<IItemProps<ITimelineExecCommandStream>> = ({ entry }) => { ... };
// ... 6 more ...
```

## 9. 캐싱 / 성능

| 영역 | 전략 |
| --- | --- |
| TimelineEntryRenderer | `React.memo` (entry.id 변경 시만 재렌더) |
| 코드 구문 강조 (자세히 보기) | lazy import (`React.lazy` for syntax highlighter) |
| diff 컴포넌트 | 기존 ToolCall diff 재사용 — 캐시 정책 동일 |
| 가상 스크롤 (`react-virtuoso`) | 자체 가상화 |
| WebSocket batch | 50ms 윈도우 (`timeline-server` 측) |

## 10. 페이지네이션

가상 스크롤 — viewport entry만 렌더. 별도 페이지네이션 없음.

큰 세션 초기 로드: `parseAll()` 후 `timeline:replace` 한 번에 전체 entry — 클라이언트가 가상화로 처리.

## 11. 정렬 / 필터

- 기본: timestamp asc (시간순)
- 필터: 미적용 (예정 작업 — entry type별 toggle 등)
- 검색: 미적용 (예정 작업)

## 12. 실시간 업데이트

| 이벤트 | 채널 | 클라이언트 처리 |
| --- | --- | --- |
| 새 라인 추가 | `timeline:append` | timeline 끝에 entry 추가 + fade-in |
| 세션 변경 (/clear) | `timeline:session-changed` | 모든 entry 클리어 + 새 빈 timeline |
| jsonl path 교체 | `timeline:replace` (옵션) | entry 전체 교체 |

## 13. 에러 처리

| 에러 | 처리 |
| --- | --- |
| 알 수 없는 entry type | switch default null → skip (forward-compatible) |
| 파서 throw (서버) | timeline-server catch + `error-notice` entry 발사 |
| WebSocket disconnect | 클라이언트 재연결 + `timeline:replace` 동기화 |
| 컴포넌트 throw | React Error Boundary catch + "표시 실패" placeholder |
| diff 렌더 실패 | fallback "diff 표시 실패" + raw text 표시 |

## 14. 데이터 타입 영향 정리

| 타입 | 변경 |
| --- | --- |
| `TTimelineEntryType` | 신규 8 type 추가 |
| `ITimelineEntry` union | 8 신규 interface 추가 |
| `ITimelineAssistantMessage.usage` | optional로 변경 |
| `TTimelineServerMessage` | 변경 없음 |

## 15. 회귀 영향

| 영역 | 영향 |
| --- | --- |
| Claude 기존 timeline | 0 — switch에 신규 case 추가만, 기존 case 보존 |
| Claude `thinking` 미표시 정책 | 유지 — switch에 case 추가 안 함 |
| Claude `agent-group` | 유지 — 기존 컴포넌트 그대로 |
| Claude `assistant-message` usage | 그대로 (optional 변경은 호환) |
| timeline-view groupedItems | 변경 없음 (sub-agent grouping 유지) |
| timeline-server protocol | 변경 없음 (WebSocket 호환) |
