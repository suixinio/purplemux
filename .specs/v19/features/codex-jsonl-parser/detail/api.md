# API 연동

> 본 feature는 HTTP API 신설 없음 — `src/lib/session-parser-codex.ts` 신규 모듈 (~700-900줄).

## 1. 모듈 시그니처

```ts
// src/lib/session-parser-codex.ts

export class CodexParser {
  constructor(jsonlPath: string);

  parseIncremental(): Promise<ITimelineEntry[]>;
  parseAll(): Promise<ITimelineEntry[]>;  // 초기 로드용
  reset(): void;  // /clear 시 in-flight + offset 리셋
  dispose(): void;  // 인스턴스 정리
}

export const createCodexParser = (jsonlPath: string): CodexParser;
```

## 2. 내부 구조

```ts
class CodexParser {
  private jsonlPath: string;
  private lastOffset: number = 0;  // 다음 read 시작 위치
  private inFlight: Map<string, IInFlightEntry> = new Map();

  async parseIncremental(): Promise<ITimelineEntry[]> {
    const stat = await fs.stat(this.jsonlPath);
    if (stat.size <= this.lastOffset) return [];

    const fd = await fs.open(this.jsonlPath, 'r');
    const buffer = Buffer.alloc(stat.size - this.lastOffset);
    await fd.read(buffer, 0, buffer.length, this.lastOffset);
    await fd.close();

    const lines = buffer.toString('utf-8').split('\n').filter(Boolean);
    this.lastOffset = stat.size;

    const entries: ITimelineEntry[] = [];
    for (const line of lines) {
      try {
        const item = JSON.parse(line) as IRolloutItem;
        const entry = this.processItem(item);
        if (entry) entries.push(entry);
      } catch (err) {
        logger.warn('codex parse line failed', { err, line: line.slice(0, 100) });
      }
    }
    return entries;
  }

  private processItem(item: IRolloutItem): ITimelineEntry | null {
    switch (item.type) {
      case 'session_meta': return null;  // 메타는 entry 발사 안 함 (cache용)
      case 'response_item': return this.processResponseItem(item.payload);
      case 'event_msg': return this.processEventMsg(item.payload);
      case 'compacted': return this.processCompacted(item.payload);
      case 'turn_context': return null;  // context 변화는 별도 처리
      default: return null;
    }
  }

  // ... 각 type별 dispatcher ...
}
```

## 3. RolloutItem 타입 정의

```ts
type IRolloutItem =
  | { timestamp: string; type: 'session_meta'; payload: ISessionMetaPayload }
  | { timestamp: string; type: 'response_item'; payload: IResponseItemPayload }
  | { timestamp: string; type: 'event_msg'; payload: IEventMsgPayload }
  | { timestamp: string; type: 'compacted'; payload: ICompactedPayload }
  | { timestamp: string; type: 'turn_context'; payload: ITurnContextPayload };

type IResponseItemPayload =
  | { type: 'message'; role: 'user' | 'assistant'; content: IContentItem[] }
  | { type: 'reasoning'; encrypted_content?: string; summary?: ISummaryItem[] }
  | { type: 'function_call'; call_id: string; name: string; arguments: string }
  | { type: 'function_call_output'; call_id: string; output: string };

type IEventMsgPayload =
  | { type: 'user_message'; message: string }
  | { type: 'agent_message'; message: string }
  | { type: 'TurnComplete' }
  | { type: 'TurnAborted' }
  | { type: 'ShutdownComplete' }
  | { type: 'PlanUpdate'; plan: IPlanItem[] }
  | { type: 'EnteredReviewMode'; description?: string }
  | { type: 'ExitedReviewMode'; outcome: 'approved' | 'rejected' }
  | { type: 'RequestUserInput'; question: string }
  | { type: 'ContextCompacted'; before_tokens: number; after_tokens: number }
  | { type: 'ExecCommandBegin'; call_id: string; command: string; cwd?: string }
  | { type: 'ExecCommandDelta'; call_id: string; chunk: string }
  | { type: 'ExecCommandEnd'; call_id: string; exit_code: number; duration_ms: number }
  | { type: 'WebSearchBegin'; call_id: string; query: string }
  | { type: 'WebSearchEnd'; call_id: string; results: any[] }
  | { type: 'McpToolCallBegin'; call_id: string; server: string; tool: string; arguments: any }
  | { type: 'McpToolCallEnd'; call_id: string; result: any }
  | { type: 'PatchApplyBegin'; call_id: string }
  | { type: 'PatchApplyUpdated'; call_id: string; path: string; status: string }
  | { type: 'PatchApplyEnd'; call_id: string; success: boolean }
  | { type: 'ExecApprovalRequest'; call_id: string; command: string }
  | { type: 'ApplyPatchApprovalRequest'; call_id: string; patches: any[] }
  | { type: 'RequestPermissions'; call_id: string; permissions: string[] }
  | { type: 'Error'; message: string }
  | { type: 'Warning'; message: string }
  | { type: 'StreamError'; message: string; retry_status?: string }
  | { type: 'GuardianWarning'; message: string }
  | { type: 'TokenCount'; info: ITokenCountInfo };
  // ... 기타 (ModelReroute, TurnDiff 등은 v19 비대상)
```

## 4. ITimelineEntry 신규 타입 (`codex-timeline-integration` 정의)

본 feature는 사용만 — 정의는 별도. 신규 타입:

- `approval-request`
- `exec-command-stream`
- `web-search`
- `mcp-tool-call`
- `patch-apply`
- `context-compacted`
- `reasoning-summary`
- `error-notice`

## 5. In-flight Map 시그니처

```ts
interface IInFlightExecCommand {
  type: 'exec';
  command: string;
  cwd?: string;
  stdoutBuffer: string;
  startTime: number;
}

interface IInFlightWebSearch {
  type: 'web-search';
  query: string;
  startTime: number;
}

interface IInFlightMcpToolCall {
  type: 'mcp';
  server: string;
  tool: string;
  arguments: any;
  startTime: number;
}

interface IInFlightPatchApply {
  type: 'patch';
  files: Array<{ path: string; status: string }>;
  startTime: number;
}

type IInFlightEntry =
  | IInFlightExecCommand
  | IInFlightWebSearch
  | IInFlightMcpToolCall
  | IInFlightPatchApply;
```

## 6. timeline-server 통합 (`codex-timeline-integration` 정의)

```ts
// timeline-server.ts (변경 사이트)
const createParser = (jsonlPath: string): IParser => {
  if (jsonlPath.includes('/.codex/sessions/')) {
    return createCodexParser(jsonlPath);
  }
  return createClaudeParser(jsonlPath);  // 기존
};
```

## 7. 데이터 흐름

```
~/.codex/sessions/.../rollout-*.jsonl (라인 append)
  ↓ fs.watch
timeline-server: parseIncremental()
  ↓
CodexParser:
  - lastOffset부터 read
  - 라인별 JSON.parse
  - processItem() 분기
  - in-flight Map 묶음 처리
  - ITimelineEntry[] 반환
  ↓
broadcastToWatcher (WebSocket 'timeline:append')
  ↓
클라이언트 timeline-view
```

## 8. 캐싱 전략

| 데이터 | 캐시 | 무효화 |
| --- | --- | --- |
| `lastOffset` | 파서 인스턴스 메모리 | 인스턴스 폐기 시 |
| `inFlight` Map | 파서 인스턴스 메모리 | End 도착 또는 stale 정리 시 |
| session_meta (첫 줄) | session-meta-cache (`codex-data-aggregation`) | 파일 mtime 변경 시 |
| RolloutItem 파싱 결과 | 캐시 안 함 (incremental) | N/A |

## 9. 페이지네이션

- timeline은 가상 스크롤 — 파서 출력 전체 발사 후 클라이언트가 viewport만 렌더
- 큰 세션 (수만 라인) 초기 로드: `parseAll()` 호출 → 전체 entry 한 번에 발사 (수 MB jsonl도 수십 ms)
- incremental은 항상 lastOffset부터 — 비용 0

## 10. 에러 처리

| 에러 | 처리 |
| --- | --- |
| 라인 1개 JSON.parse 실패 | skip + `logger.warn` (dedup) — 다음 라인 정상 |
| RolloutItem type 알 수 없음 | skip + `logger.warn` (dedup) — 신규 type 추가 시 무시 |
| in-flight Begin 누락 (Delta/End만 있음) | skip + `logger.warn` |
| in-flight End 누락 (Begin만) | 다음 turn 시작 시 stale 정리 + `error-notice` entry 발사 |
| stdout buffer 한도 초과 | truncate + "[... truncated, total Nbytes]" 추가 |
| 파일 read I/O 실패 | throw → caller catch → 다음 사이클 재시도 (lastOffset 유지) |

## 11. 회귀 영향 — Claude 파서 무영향

| 영역 | 영향 |
| --- | --- |
| `session-parser.ts` (Claude) | 변경 없음 |
| timeline-server provider 분기 | jsonl path 검사로 분리 — Claude 경로 무영향 |
| `ITimelineEntry` 기존 타입 | optional 필드(`usage`)만 추가 — 기존 데이터 호환 |
