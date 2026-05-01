# API 연동

> 본 feature는 status-manager 폴링 사이클 내부 로직 — HTTP API 신설 없음.

## 1. 통합 지점 — `status-manager.ts` 폴링 사이클

기존 `lib/status-manager.ts`의 `pollOnce(entry)` 또는 동등 함수에 codex 분기 추가:

```ts
const pollOnce = async (entry: ITabStatusEntry) => {
  // ... 기존 로직 ...

  // Codex TUI ready 감지 (cliState='inactive'일 때만)
  if (entry.cliState === 'inactive' && entry.panelType === 'codex-cli') {
    if (await checkCodexTuiReady(entry)) {
      statusManager.updateTabFromHook(entry.tmuxSession, 'session-start');
    }
  }

  // ... 나머지 로직 (status-resilience F1/F2 등) ...
};
```

## 2. checkCodexTuiReady 시그니처

```ts
export const checkCodexTuiReady = async (entry: ITabStatusEntry): Promise<boolean> => {
  // Layer 1: 프로세스 검출
  const panePid = await getSessionPanePid(entry.tmuxSession);
  if (!panePid) return false;
  const running = await codexProvider.isAgentRunning(panePid);
  if (!running) return false;

  // Layer 2: pane title 형식
  const title = entry.paneTitle ?? '';
  const isShellStyle = /^[^|]+\|[^|]+$/.test(title);
  if (isShellStyle) return false;

  // Layer 3: pane content
  const content = await capturePaneAtWidth(entry.tmuxSession, 80);
  if (!content) return false;
  const hasBox = content.includes('╭') && content.includes('╰');
  const hasMarker = content.includes('›') || content.includes('!');
  return hasBox && hasMarker;
};
```

## 3. capturePaneAtWidth 재사용

기존 `lib/tmux.ts` 함수 (Claude provider도 사용 중):

```ts
export const capturePaneAtWidth = async (
  session: string,
  width: number,
): Promise<string | null>;
```

- `tmux capture-pane -p -t <session> -J` (line wrap join)
- 폭 80자로 정규화 (composer 박스가 80자 기준)
- 실패 시 null + `logger.warn`

## 4. 호출 빈도 / 비용

| 단계 | 비용 | 빈도 |
| --- | --- | --- |
| Layer 1 (`isAgentRunning`) | grandchild walk ~5ms | 매 사이클 (`inactive` codex 탭) |
| Layer 2 (paneTitle) | 0 (이미 폴링 사이클에서 호출 중) | 매 사이클 |
| Layer 3 (`capturePaneAtWidth`) | ~30-50ms | Layer 1+2 통과 시만 |
| **총 비용 (활성 codex 탭)** | ~50ms/사이클 | 30s/45s/60s 사이클 |
| **총 비용 (미실행 codex 탭)** | ~5ms/사이클 (Layer 1만) | 동일 |

## 5. 데이터 타입

본 feature는 새 타입 추가 없음. 기존 사용:

- `ITabStatusEntry` — `cliState`, `panelType`, `paneTitle`, `tmuxSession`
- `TCliState` — `'inactive' | 'unknown' | 'busy' | 'idle' | 'needs-input' | 'ready-for-review'`

## 6. 부수 효과

- `updateTabFromHook(session, 'session-start')` 호출 (synthetic) — cliState 'idle' 전환
- `entry.lastResumeOrStartedAt = now` 갱신 (status-resilience F1 grace 가동)
- 클라이언트 sync-server WebSocket으로 `tab:status` push

## 7. 캐싱 전략

| 데이터 | 캐시 | 무효화 |
| --- | --- | --- |
| Layer 1 결과 | 캐시 안 함 (매 사이클 fresh) | N/A |
| paneTitle | status-manager 폴링 사이클이 자체 캐시 | 폴링 사이클 |
| pane content | 캐시 안 함 (Layer 1+2 통과 시만 호출이라 비용 자체가 낮음) | N/A |

## 8. 에러 처리

| 에러 | 처리 |
| --- | --- |
| `getSessionPanePid` 실패 | Layer 1 false 처리 |
| `isAgentRunning` throw | catch → false 처리 + `logger.warn` |
| `capturePaneAtWidth` 실패 | false 처리 + `logger.warn` (반복 시 dedup) |
| boot 5초+ 영구 실패 | UI에 boot error 표시 (`codex-tui-ready-detection/ui.md`) — 사용자 액션 유도 |

## 9. 옵션 — Fast-tick 트리거 (v19 외부 검토)

사용자 메뉴 클릭 직후 status-manager에 외부 신호로 1회 fast-poll 트리거:

```ts
// codex launch 직후 호출
statusManager.requestFastPoll(tmuxSession, { intervalMs: 500, maxAttempts: 6 });
```

- 30s 사이클 대기 회피 → boot indicator 시간 ↓
- 6 × 500ms = 3초 빠른 감지 후 일반 사이클 합류
- 본 v19에 포함 안 함 — 사용자 데이터 측정 후 결정

## 10. 회귀 영향

| 영역 | 영향 | 검증 |
| --- | --- | --- |
| Claude 패널 | 0 — 분기는 `panelType === 'codex-cli'`로 보호 | 풀 turn 회귀 검증 |
| terminal/diff/web-browser | 0 — `cliState='inactive'` 검사 자체가 agent 탭만 진입 | 시각 검증 |
| status-manager 폴링 비용 | 활성 codex 탭당 +50ms/사이클 (30s 사이클 기준 0.16% overhead) | 측정 |
