# API 연동

> 본 feature는 HTTP API 신설 없음 — status-manager 내부 로직 보강 + Store 시그니처 변경.

## 1. status-manager 시그니처 변경

### `ITabStatusEntry` 신규 필드

```ts
interface ITabStatusEntry {
  // ... 기존 필드 ...
  lastResumeOrStartedAt?: number;  // 신규 — F1 grace용 (런타임 only, 디스크 저장 X)
}
```

### `pollOnce` 분기 추가

```ts
const pollOnce = async (entry: ITabStatusEntry) => {
  // ... codex TUI ready 검사 (별도 feature) ...

  const isAgentTab = entry.panelType === 'claude-code' || entry.panelType === 'codex-cli';
  if (!isAgentTab) return;

  const running = await getProvider(entry.panelType).isAgentRunning(entry.panePid);
  if (running) {
    // ... 기존 idle/busy 분기 ...
    return;
  }

  // running false — F1/F2 검사
  if (entry.cliState === 'inactive' || entry.cliState === 'unknown') return;

  // F1: recent-launch grace
  const now = Date.now();
  if (entry.lastResumeOrStartedAt && now - entry.lastResumeOrStartedAt < 5000) return;

  // F2: paneTitle agent 형식
  const title = entry.paneTitle ?? '';
  const isShellStyle = !!title && /^[^|]+\|[^|]+$/.test(title);
  if (!isShellStyle && title) return;  // shell 형식 아니면 유지

  // 안전 inactive 전환
  statusManager.setCliState(entry, 'inactive');
};
```

### `lastResumeOrStartedAt` 갱신 사이트

```ts
// auto-resume.ts — sendResumeKeys 직후
entry.lastResumeOrStartedAt = Date.now();

// status-manager.ts — handleClaudeHook / handleCodexHook의 SessionStart 처리
if (event.type === 'session-start') {
  entry.lastResumeOrStartedAt = Date.now();
  // ... 기존 처리 ...
}

// codex-tui-ready-detection의 synthetic SessionStart
statusManager.updateTabFromHook(session, 'session-start');
// updateTabFromHook 내부에서 lastResumeOrStartedAt 갱신
```

## 2. sendKeysSeparated 헬퍼 (`lib/tmux.ts`)

```ts
export const sendKeysSeparated = async (session: string, text: string): Promise<void> => {
  await sendKeys(session, text);  // text만 (Enter 없음)
  await sleep(50);
  await sendKeys(session, 'Enter');
};
```

### 호출 사이트 (모두 사용자 입력 → agent CLI 경로)

| 파일 | 변경 |
| --- | --- |
| `web-input-bar.tsx:236-237` | 이미 50ms 분리 패턴 — 헬퍼로 통합 |
| `auto-resume.ts` (codex resume 명령) | `sendKeys(session, 'codex resume <id>\n')` → `sendKeysSeparated(session, 'codex resume <id>')` |
| `tabs/index.ts` 등 codex launch 사이트 | 동일 |

기존 `sendKeys` 호출자(shell이 받는 경로)는 변경 없음 — 50ms 분리 영향 없음.

## 3. matchesProcess 시그니처 확장

```ts
// 기존
matchesProcess: (cmd: string) => boolean;

// 신규
matchesProcess: (cmd: string, args?: string[]) => boolean;
```

### 호출 사이트 일괄 마이그

| 파일 | 변경 |
| --- | --- |
| `lib/auto-resume.ts:62` | `getProviderByProcessName(cmd)` → `getProviderByProcessName(cmd, args)` |
| `lib/status-manager.ts` (관련 영역) | 동일 |
| `lib/session-detection.ts` | 동일 |

### Claude/Codex implementation

```ts
// providers/claude/index.ts
matchesProcess: (cmd: string, args?: string[]): boolean => {
  if (cmd === 'claude') return true;
  if (cmd === 'node' && args?.some((a) => a.endsWith('claude.js'))) return true;
  return false;
},

// providers/codex/index.ts
matchesProcess: (cmd: string, args?: string[]): boolean => {
  if (cmd === 'codex') return true;
  if (cmd === 'node' && args?.some((a) => a.endsWith('codex.js'))) return true;
  return false;
},
```

## 4. Store 일반화 — `useTabStore` 시그니처

### 기존 → 신규

```ts
// 기존
interface ITabStoreEntry {
  claudeProcess: boolean | null;
  claudeProcessCheckedAt: number;
  claudeInstalled: boolean;
  // ... 기타 ...
}

setClaudeProcess(tabId: string, value: boolean | null): void;
setClaudeInstalled(value: boolean): void;

// 신규
interface ITabStoreEntry {
  agentProcess: boolean | null;
  agentProcessCheckedAt: number;
  agentInstalled: boolean;
  // ... 기타 ...
}

setAgentProcess(tabId: string, value: boolean | null): void;
setAgentInstalled(value: boolean): void;
```

### 변경 사이트 (~10곳, 일괄 rename)

```
use-tab-store.ts:17-68,123-142
pane-container.tsx:200,345,655,663,726,732
claude-code-panel.tsx:51-52,92,113-116,134,147-154,170,188,244
mobile-claude-code-panel.tsx:71-72,107,128-131
mobile-surface-view.tsx:137,203,392,398
```

신규 `codex-panel.tsx`/`mobile-codex-panel.tsx`는 처음부터 일반화 필드 사용.

## 5. 데이터 타입 영향

| 타입 | 변경 |
| --- | --- |
| `ITabStatusEntry` | `lastResumeOrStartedAt?: number` 추가 (런타임 only) |
| `IAgentProvider.matchesProcess` | 시그니처 (`cmd, args?`) 변경 |
| `ITabStoreEntry` | `claude*` → `agent*` rename |

## 6. 디스크 호환성

| 항목 | 호환 |
| --- | --- |
| `lastResumeOrStartedAt` | 디스크 저장 안 함 — 마이그 불필요 |
| `agent*` Store 필드 | Store는 메모리 only (Zustand) — 마이그 불필요 |
| `IAgentProvider.matchesProcess` | 빌드 시점 strict — 모든 호출 사이트 동시 변경 |

## 7. 캐싱 / 성능

| 영역 | 영향 |
| --- | --- |
| F1 검사 | 메모리 read (timestamp 비교) — 비용 0 |
| F2 검사 | paneTitle은 사이클이 이미 fetch — 추가 호출 0 |
| sendKeysSeparated | 메시지당 +50ms (사용자 체감 거의 없음) |
| 폴링 사이클 비용 | 변동 없음 |

## 8. 에러 처리

| 에러 | 처리 |
| --- | --- |
| F1/F2 모두 통과 후 inactive 전환 실패 | `logger.warn` + 다음 사이클 재시도 |
| sendKeysSeparated 첫 send 실패 | throw → caller catch → 토스트 + 입력 복원 |
| sendKeysSeparated 50ms 후 Enter 실패 | text는 들어간 상태 — 사용자에게 "Enter 키 직접 누르세요" 토스트 (희귀) |
| matchesProcess args undefined | provider implementation에서 graceful fallback (기존 cmd만 검사) |

## 9. 회귀 영향

| 영역 | 영향 |
| --- | --- |
| Claude 기존 동작 | F1/F2 가드 추가 — busy stuck 등 잠재 버그 견고화 (긍정 영향) |
| Codex 신규 | F1/F2로 ping-pong 차단 |
| Store rename | TypeScript strict로 미마이그 사이트 컴파일 오류 — 사전 차단 |
| sendKeys 기존 호출자 | shell 경로라 영향 없음 (50ms 분리 미적용) |
