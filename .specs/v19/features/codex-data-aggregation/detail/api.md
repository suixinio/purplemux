# API 연동

## 1. stats aggregator (옵션 B — 신규 모듈)

### 모듈 구조

```
src/lib/stats/
├── jsonl-parser.ts          # 기존 Claude — 무변경
├── jsonl-parser-codex.ts    # 신규
└── stats-aggregator.ts      # 신규
```

### `aggregateStats` 시그니처

```ts
// src/lib/stats/stats-aggregator.ts
export interface IAggregatedStats {
  daily: Array<{
    day: string;          // YYYY-MM-DD
    claudeTokens: number;
    codexTokens: number;
    claudeSessions: number;
    codexSessions: number;
  }>;
  totals: {
    claude: { tokens: number; sessions: number };
    codex: { tokens: number; sessions: number };
  };
  codexExtras?: {
    rateLimits: {
      primary: { usedPercent: number };
      // ... 추가 필드 (codex schema 기준) ...
    };
    modelContextWindow: number;
    cachedInputTokens: number;
    reasoningOutputTokens: number;
  };
  errors?: Array<{ provider: 'claude' | 'codex'; message: string }>;
}

export const aggregateStats = async (period: {
  startMs: number;
  endMs: number;
}): Promise<IAggregatedStats> => {
  const [claudeResult, codexResult] = await Promise.allSettled([
    parseClaudeJsonl(period),
    parseCodexJsonl(period),
  ]);

  const claudeStats = claudeResult.status === 'fulfilled' ? claudeResult.value : null;
  const codexStats = codexResult.status === 'fulfilled' ? codexResult.value : null;

  return mergeStats(claudeStats, codexStats);
};
```

### `Promise.allSettled` 선택 이유

- `Promise.all`이면 한 provider 실패 시 전체 throw
- `Promise.allSettled`로 graceful degradation — 한 provider 실패해도 다른 provider 데이터 표시

## 2. Codex parser — `jsonl-parser-codex.ts`

### 시그니처

```ts
export const parseCodexJsonl = async (period: {
  startMs: number;
  endMs: number;
}): Promise<IProviderStats> => {
  const sessions = await scanCodexSessions(period);
  const daily = aggregateDaily(sessions);
  const totals = aggregateTotals(sessions);
  const extras = extractRateLimits(sessions);  // 가장 최근 session에서
  return { daily, totals, extras };
};

interface IProviderStats {
  daily: Array<{ day: string; tokens: number; sessions: number }>;
  totals: { tokens: number; sessions: number };
  extras?: ICodexExtras;
}
```

### Token 추출 로직

```ts
const extractCodexTokens = async (jsonlPath: string): Promise<number> => {
  // 마지막 token_count event의 total_token_usage 추출 (이미 누적)
  const lines = await readLastLines(jsonlPath, 100);  // 마지막 100줄만
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const item = JSON.parse(lines[i]);
      if (item.type === 'event_msg' && item.payload.type === 'TokenCount') {
        return item.payload.info.total_token_usage ?? 0;
      }
    } catch { continue; }
  }
  return 0;  // token_count 없음
};
```

### Rate limits 추출

```ts
const extractRateLimits = (sessions: ICodexSessionEntry[]): ICodexExtras | null => {
  // 가장 최근 active 세션의 마지막 token_count event
  const latest = sessions.sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!latest) return null;
  // ... (token_count.info에서 rate_limits, model_context_window, ... 추출) ...
};
```

## 3. Claude parser — `jsonl-parser.ts` 무변경

기존 호출자는 `aggregateStats` 사용으로 마이그 — `jsonl-parser.ts` 자체는 변경 없음.

## 4. session-meta-cache 일반화

### 시그니처 변경

```ts
// src/lib/session-meta-cache.ts (기존)
export const getSessionMeta = async (jsonlPath: string): Promise<ISessionMeta>;

// 신규 (key 결합)
export const getSessionMeta = async (
  providerId: 'claude' | 'codex',
  sessionId: string,
  jsonlPath: string,
): Promise<ISessionMeta>;
```

### 내부 Map key

```ts
const cache = new Map<string, { meta: ISessionMeta; mtime: number }>();

const cacheKey = (providerId: string, sessionId: string) => `${providerId}:${sessionId}`;

// 충돌 회피 — Claude UUID와 Codex UUID가 우연히 같아도 분리
```

### `ISessionMeta` 변경 없음

provider 무관 — Map key만 결합.

## 5. session-history (notification-sheet) 일반화

### `ISessionHistoryEntry` 마이그

```ts
// 기존
interface ISessionHistoryEntry {
  id: string;
  claudeSessionId: string | null;  // deprecated (lazy 마이그)
  // ...
}

// 신규
interface ISessionHistoryEntry {
  id: string;
  agentSessionId: string | null;   // 신규
  providerId: 'claude' | 'codex';  // 신규 (default 'claude')
  claudeSessionId?: string | null; // deprecated — read만 (write 안 함)
  // ...
}
```

### 디스크 호환 — Lazy 마이그

```ts
// src/lib/session-history.ts
export const loadSessionHistory = async (): Promise<ISessionHistoryEntry[]> => {
  const raw = await fs.readFile('~/.purplemux/session-history.json', 'utf-8');
  const entries = JSON.parse(raw) as any[];
  return entries.map((e) => {
    if (e.agentSessionId !== undefined) return e;  // 신규 형식
    // legacy → 마이그
    return {
      ...e,
      agentSessionId: e.claudeSessionId,
      providerId: 'claude',
    };
  });
};

export const saveSessionHistory = async (entries: ISessionHistoryEntry[]) => {
  // write 시엔 legacy 필드 제거 (정리)
  const cleaned = entries.map(({ claudeSessionId, ...rest }) => rest);
  await fs.writeFile('~/.purplemux/session-history.json', JSON.stringify(cleaned, null, 2));
};
```

### `notification-sheet.tsx` 변경 사이트

```tsx
// line ~144-148
const groupHistoryBySession = (entries: ISessionHistoryEntry[]) => {
  const groups = new Map<string, ISessionHistoryEntry[]>();
  for (const entry of entries) {
    const key = `${entry.providerId}:${entry.agentSessionId ?? entry.id}`;  // 신규 key 형식
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return Array.from(groups.values());
};
```

### 그룹 헤더 렌더

```tsx
const SessionGroupHeader = ({ entries }: { entries: ISessionHistoryEntry[] }) => {
  const first = entries[0];
  const Icon = first.providerId === 'codex' ? OpenAIIcon : ClaudeIcon;
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4" />
      <span>{first.providerId === 'codex' ? 'Codex' : 'Claude'}</span>
      {/* ... */}
    </div>
  );
};
```

## 6. session-history Codex 디렉토리 스캔

`~/.codex/sessions/YYYY/MM/DD/` 일자 파티셔닝 디렉토리 스캔 — `codex-session-list` feature와 동일 로직 재사용:

```ts
const scanCodexSessions = async (period) => {
  // codex-session-list의 listCodexSessions와 유사
  // 단, cwd 필터 없이 전체 스캔
};
```

비용 가드: 최근 30일만, 첫 줄만 read, session-meta-cache 활용.

## 7. ContextRing Codex 통합

### 시그니처 변경

```ts
// src/components/features/context-ring.tsx
const useSessionStats = (tabId: string): ISessionStats | null => {
  const tab = useTabStore((s) => s.tabs[tabId]);
  // provider 분기
  return tab.agentState?.providerId === 'codex'
    ? useCodexSessionStats(tab.agentState.sessionId, tab.agentState.jsonlPath)
    : useClaudeSessionStats(tab.agentState?.sessionId);
};
```

### Codex SessionStats 추출

```ts
const useCodexSessionStats = (sessionId: string, jsonlPath: string): ISessionStats => {
  // jsonl tail에서 마지막 token_count event를 source로
  // WebSocket 'session-stats:updated' 구독
  return {
    used: tokenCount.total_token_usage,
    modelMax: tokenCount.info.model_context_window,
    cachedInput: tokenCount.info.cached_input_tokens,
    reasoningOutput: tokenCount.info.reasoning_output_tokens,
  };
};
```

## 8. HTTP API

### `GET /api/stats?startMs=<ms>&endMs=<ms>`

Response (`IAggregatedStats` JSON):

```json
{
  "daily": [
    { "day": "2026-04-01", "claudeTokens": 4200, "codexTokens": 1800, "claudeSessions": 2, "codexSessions": 1 },
    ...
  ],
  "totals": {
    "claude": { "tokens": 124500, "sessions": 47 },
    "codex": { "tokens": 87200, "sessions": 23 }
  },
  "codexExtras": {
    "rateLimits": { "primary": { "usedPercent": 32 } },
    "modelContextWindow": 200000,
    "cachedInputTokens": 12400,
    "reasoningOutputTokens": 8700
  },
  "errors": []
}
```

### Query 파라미터

| 이름 | 필수 | 비고 |
| --- | --- | --- |
| `startMs` | Y | period 시작 (ms epoch) |
| `endMs` | Y | period 종료 (ms epoch) |

## 9. 데이터 타입

| 타입 | 변경 |
| --- | --- |
| `IAggregatedStats` | 신규 |
| `IProviderStats` | 신규 |
| `ICodexExtras` | 신규 |
| `ISessionMeta` | 변경 없음 |
| `ISessionHistoryEntry` | `agentSessionId` + `providerId` 추가 / `claudeSessionId` deprecated |
| `ISessionStats` | `cachedInput`, `reasoningOutput` optional 추가 |

## 10. 캐싱 전략

| 데이터 | 캐시 위치 | TTL |
| --- | --- | --- |
| `aggregateStats` 결과 | react-query 클라이언트 | staleTime 60s |
| `parseClaudeJsonl` 결과 | 메모리 (file mtime) | mtime 변경 시 |
| `parseCodexJsonl` 결과 | 동일 | 동일 |
| `session-meta-cache` | 메모리 (Map) | mtime 변경 시 |
| ContextRing sessionStats | WebSocket 구독 (실시간) | event 도착마다 |

## 11. 페이지네이션

- daily는 30일 한도 (period 시작/종료로 제한)
- session 목록 페이지네이션 미적용 (가상 스크롤 활용)
- 향후 (예정 작업): SQLite state DB로 더 긴 기간 + 검색

## 12. 정렬 / 필터

| UI | API 조건 |
| --- | --- |
| Period selector | `startMs`, `endMs` |
| Provider 카드 클릭 (필터 — 옵션) | client-side 필터 |
| Notification sheet 검색 (예정 작업) | client-side text match |

## 13. 실시간 업데이트

| 이벤트 | 채널 | 동작 |
| --- | --- | --- |
| 세션 종료 (TurnComplete + Stop) | WebSocket `session-stats:updated` | ContextRing 갱신 |
| 새 세션 시작 | sync-server `session-history:append` | notification-sheet 추가 |
| /clear → 새 jsonl path | `session-stats:reset` | ContextRing 0% |
| Stats 페이지 자동 갱신 | react-query refetchOnFocus | 페이지 재진입 시 |

## 14. 에러 처리

| 에러 | 처리 |
| --- | --- |
| Claude 파서 throw | `errors[]`에 추가 + Claude 합계 "에러" 표시 |
| Codex 디렉토리 read 실패 | 동일 |
| 두 provider 모두 실패 | 전체 에러 + Retry 버튼 |
| session-history 마이그 실패 (legacy 손상) | catch + 빈 history + `logger.error` |
| token_count event 미존재 (codex 미완료 세션) | tokens=0 표시 (graceful) |
| Map key 결합 충돌 | provider prefix로 회피 — 발생 안 함 |

## 15. 회귀 영향

| 영역 | 영향 |
| --- | --- |
| 기존 `jsonl-parser.ts` (Claude) | 무변경 — 호출자만 aggregator로 마이그 |
| 기존 ContextRing | provider 분기 추가 — Claude 경로 무영향 |
| 기존 notification-sheet | lazy 마이그 — 사용자 인지 없이 자연 갱신 |
| `session-history.json` 디스크 | 호환 read + 신규 형식 write — 한 번 write 후 정리됨 |
| `session-meta-cache` 시그니처 | 호출 사이트 일괄 변경 (TypeScript strict) |
