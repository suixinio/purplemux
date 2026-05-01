# API 연동

## 1. listCodexSessions API

### 시그니처

```ts
// src/lib/codex-session-list.ts
export const listCodexSessions = async (params: {
  cwd: string;
  daysBack?: number;  // default 30
}): Promise<ICodexSessionEntry[]>;

interface ICodexSessionEntry {
  sessionId: string;
  jsonlPath: string;
  startedAt: number;        // ms epoch
  cwd: string | null;
  model: string | null;
  firstUserMessage: string | null;
  totalTokens: number | null;  // Phase 4 — codex-data-aggregation 통합
}
```

### HTTP 노출 (옵션 — 클라이언트 react-query 호출)

`GET /api/codex/sessions?cwd=<cwd>&daysBack=30`

```json
{
  "sessions": [
    {
      "sessionId": "01997fee-5078-7d32-aeb3-0b141d322a26",
      "jsonlPath": "/Users/.../rollout-2025-09-25T17-12-28-...jsonl",
      "startedAt": 1714456800000,
      "cwd": "/Users/.../my-project",
      "model": "gpt-5-codex",
      "firstUserMessage": "Add user authentication",
      "totalTokens": 12400
    },
    ...
  ],
  "scannedDirs": 30,
  "scannedFiles": 47
}
```

### Query 파라미터

| 이름 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| `cwd` | string | Y | 워크스페이스 cwd 필터 |
| `daysBack` | number | N | default 30. 최근 N일만 스캔 |

### 응답 코드

| 코드 | 의미 |
| --- | --- |
| 200 | 정상 |
| 400 | cwd 누락 |
| 500 | 디렉토리 스캔 실패 (`logger.error` 동시 발생) |

## 2. 디렉토리 스캔 로직

```ts
const SESSIONS_ROOT = path.join(os.homedir(), '.codex', 'sessions');
const MAX_DAYS_BACK = 30;

export const listCodexSessions = async ({ cwd, daysBack = MAX_DAYS_BACK }) => {
  const sessions: ICodexSessionEntry[] = [];
  const today = new Date();

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dirPath = path.join(
      SESSIONS_ROOT,
      `${date.getFullYear()}`,
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    );

    let files: string[];
    try {
      files = await fs.readdir(dirPath);
    } catch {
      continue;  // 디렉토리 미존재 OK
    }

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const jsonlPath = path.join(dirPath, file);
      try {
        const meta = await getSessionMeta(jsonlPath);  // session-meta-cache 활용
        if (meta.cwd !== cwd) continue;  // cwd 필터
        sessions.push(meta);
      } catch (err) {
        logger.warn('codex session meta failed', { jsonlPath, err });
      }
    }
  }

  // 시작 시간 desc 정렬
  sessions.sort((a, b) => b.startedAt - a.startedAt);
  return sessions;
};
```

## 3. session-meta-cache 통합 (`codex-data-aggregation` 정의)

```ts
// src/lib/session-meta-cache.ts
const cache = new Map<string, { meta: ISessionMeta; mtime: number }>();

export const getSessionMeta = async (jsonlPath: string): Promise<ICodexSessionEntry> => {
  const stat = await fs.stat(jsonlPath);
  const cached = cache.get(jsonlPath);
  if (cached && cached.mtime === stat.mtimeMs) return cached.meta;

  // 첫 줄만 read (session_meta)
  const firstLine = await readFirstLine(jsonlPath);
  const item = JSON.parse(firstLine);
  if (item.type !== 'session_meta') throw new Error('not a session_meta line');

  // 첫 user message는 추가 read 필요 (옵션 — 빈 결과면 cache에서 한 번 더)
  const firstUserMessage = await extractFirstUserMessage(jsonlPath);

  const meta: ICodexSessionEntry = {
    sessionId: item.payload.session_id,
    jsonlPath,
    startedAt: new Date(item.timestamp).getTime(),
    cwd: item.payload.cwd ?? null,
    model: item.payload.model ?? null,
    firstUserMessage,
    totalTokens: null,  // Phase 4 stats에서 별도 채움
  };

  cache.set(jsonlPath, { meta, mtime: stat.mtimeMs });
  return meta;
};
```

## 4. 클라이언트 — react-query 통합

```ts
// hooks/use-codex-sessions.ts
export const useCodexSessions = (cwd: string | null) => {
  return useQuery({
    queryKey: ['codex-sessions', cwd],
    queryFn: () => fetch(`/api/codex/sessions?cwd=${encodeURIComponent(cwd!)}`).then((r) => r.json()),
    enabled: !!cwd,
    staleTime: 30_000,  // 30초
    cacheTime: 5 * 60_000,  // 5분
  });
};
```

### Prefetch

```ts
// pane-new-tab-menu.tsx
<DropdownMenuItem
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ['codex-sessions', workspace.cwd],
      queryFn: ...,
      staleTime: 30_000,
    });
  }}
>
  Codex 세션 목록
</DropdownMenuItem>
```

## 5. resume 액션

```ts
// 카드 클릭 핸들러
const handleSessionClick = async (session: ICodexSessionEntry) => {
  closeSheet();  // 낙관적
  try {
    const tabId = currentTabId ?? await createNewTab({ panelType: 'codex-cli' });
    await sendKeysSeparated(tab.tmuxSession, `codex resume ${session.sessionId}`);
    statusManager.notifyResume(tab.tmuxSession);  // lastResumeOrStartedAt 갱신
  } catch (err) {
    notifyCodexResumeFailed(() => handleSessionClick(session));
  }
};
```

## 6. 데이터 타입

### `ICodexSessionEntry` (위 정의 재참조)

### `ISessionMeta` (codex-data-aggregation 정의 — 일반화)

```ts
interface ISessionMeta {
  providerId: 'claude' | 'codex';
  sessionId: string;
  jsonlPath: string;
  startedAt: number;
  cwd: string | null;
  model: string | null;
  // ... provider별 추가 필드 (optional) ...
}
```

## 7. 캐싱 전략

| 데이터 | 캐시 | TTL |
| --- | --- | --- |
| `session-meta-cache` (서버) | Map (key=`${providerId}:${sessionId}` 또는 jsonlPath) | mtime watch |
| react-query (`codex-sessions`) | 클라이언트 메모리 | staleTime 30s, cacheTime 5min |
| Prefetch 워밍 | react-query 캐시 | 동일 |

## 8. 페이지네이션

v19 미적용 — 30일 한도 + 가상 스크롤로 충분.

향후 1000+ 세션 환경 (예정 작업):
- offset/limit 페이지네이션
- 또는 SQLite state DB 도입

## 9. 정렬

- 기본: `startedAt desc` (최근 우선)
- v19에선 정렬 옵션 미제공 (예정 작업)

## 10. 필터

| 필터 | 적용 | 비고 |
| --- | --- | --- |
| cwd | 필수 (워크스페이스) | server-side |
| 검색 (예정 작업) | client-side text match | v19 외부 |
| 날짜 범위 (예정 작업) | server-side daysBack 확장 | v19 외부 |

## 11. 실시간 업데이트

| 이벤트 | 채널 | 동작 |
| --- | --- | --- |
| 새 codex 세션 시작 | hook 채널 → react-query invalidate | 다음 sheet 진입 시 새 세션 표시 |
| 세션 archived 이동 | fs.watch (옵션) | 즉시 목록에서 제거 |
| meta 캐시 무효화 | mtime 변경 시 자동 | 캐시 miss → re-read |

## 12. 에러 처리

| 에러 | 처리 |
| --- | --- |
| 디렉토리 read 실패 (권한) | `logger.warn` + skip 해당 dir |
| jsonl 첫 줄 파싱 실패 | skip 해당 파일 + `logger.warn` (dedup) |
| 가상 스크롤 측정 실패 | fallback 일반 스크롤 |
| react-query 네트워크 실패 | error state + Retry 버튼 |
| resume 실패 | 토스트 D + sheet 다시 열기 액션 |

## 13. 보안

- jsonl 파일은 사용자 home 디렉토리 — 외부 노출 X
- API endpoint는 기존 cli-token 인증 (`x-pmux-token` + IP 필터)
