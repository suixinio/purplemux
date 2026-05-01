# API 연동

> 본 feature는 HTTP API 신설 없음 — `IAgentProvider.attachWorkStateObserver` 슬롯 정식 구현 + status-manager subscribe 마이그.

## 1. IAgentProvider 슬롯 시그니처 (Phase 4 활성)

```ts
interface IAgentProvider {
  // ... 기존 슬롯 ...

  attachWorkStateObserver: (
    panePid: number,
    callback: (event: TAgentWorkStateEvent) => void,
  ) => () => void;  // unsubscribe
}
```

Phase 1~3에선 `null` (helper 패턴). Phase 4 마이그 시 함수로 채워짐.

## 2. TAgentWorkStateEvent 타입 (확장)

```ts
type TAgentWorkStateEvent =
  | { type: 'session-start'; source?: 'startup' | 'resume' | 'clear' }
  | { type: 'prompt-submit'; prompt?: string }
  | { type: 'stop' }
  | { type: 'notification'; notificationType: string; message?: string }
  | { type: 'message-append'; entries: ITimelineEntry[] }  // 신규 — jsonl tail 통합
  | { type: 'session-info'; sessionId: string; jsonlPath?: string };  // 신규 — 메타 변경
```

`message-append`는 마이그 전에는 timeline-server 단독 처리 — 마이그 후엔 observer가 emit.

## 3. Claude observer 구현 (`providers/claude/work-state-observer.ts`)

```ts
export const attachWorkStateObserver = (
  panePid: number,
  callback: (event: TAgentWorkStateEvent) => void,
): (() => void) => {
  // 1. hook 채널 listen
  const hookListener = (tmuxSession: string, payload: any) => {
    if (!matchesPanePid(tmuxSession, panePid)) return;
    const event = translateClaudeHookEvent(payload);
    if (event) callback(event);
  };
  globalThis.__ptClaudeHookEvents?.on('hook', hookListener);

  // 2. jsonl tail (기존 fs.watch 로직 이동)
  const jsonlPath = getClaudeJsonlPath(panePid);
  const watcher = createJsonlTail(jsonlPath, (lines) => {
    const entries = parseClaudeLines(lines);
    callback({ type: 'message-append', entries });
  });

  return () => {
    globalThis.__ptClaudeHookEvents?.off('hook', hookListener);
    watcher.close();
  };
};
```

## 4. Codex observer 구현 (`providers/codex/work-state-observer.ts`)

```ts
export const attachWorkStateObserver = (
  panePid: number,
  callback: (event: TAgentWorkStateEvent) => void,
): (() => void) => {
  // hook 채널 단독 listen (디렉토리 fs.watch 회피)
  const hookListener = (tmuxSession: string, payload: any) => {
    if (!matchesPanePid(tmuxSession, panePid)) return;

    // session-info 메타 emit
    if (payload.transcript_path) {
      callback({
        type: 'session-info',
        sessionId: payload.session_id,
        jsonlPath: payload.transcript_path,
      });
    }

    // standard work state 변환
    const event = translateCodexHookEvent(payload);
    if (event) {
      // SessionStart source 분기는 callback 호출자가 처리
      if (event.type === 'session-start' && payload.source) {
        callback({ ...event, source: payload.source });
      } else {
        callback(event);
      }
    }
  };
  globalThis.__ptCodexHookEvents?.on('hook', hookListener);

  // jsonl tail은 timeline-server가 transcript_path로 직접 watch (observer는 hook만)
  return () => {
    globalThis.__ptCodexHookEvents?.off('hook', hookListener);
  };
};
```

## 5. status-manager subscribe 마이그

### `setupObservers()` 함수 신설 (서버 부트 시 + 탭 생성/변경 시)

```ts
// status-manager.ts
const observerCleanups = new Map<string, () => void>();  // tabId → unsubscribe

export const setupObserver = (tab: ITab) => {
  // 기존 cleanup
  observerCleanups.get(tab.id)?.();

  if (tab.panelType !== 'claude-code' && tab.panelType !== 'codex-cli') return;
  const provider = getProvider(tab.panelType);
  if (!provider.attachWorkStateObserver) return;  // Phase 1~3 fallback

  const panePid = await getSessionPanePid(tab.tmuxSession);
  if (!panePid) return;

  const unsubscribe = provider.attachWorkStateObserver(panePid, (event) => {
    handleObserverEvent(tab, event);
  });
  observerCleanups.set(tab.id, unsubscribe);
};

const handleObserverEvent = (tab: ITab, event: TAgentWorkStateEvent) => {
  const entry = getEntry(tab.tmuxSession);
  switch (event.type) {
    case 'session-start':
      if (event.source === 'clear') {
        entry.agentSummary = null;
        entry.lastUserMessage = null;
        entry.lastAssistantMessage = null;
        updateTabState(entry, 'session-start');
      } else if (entry.cliState === 'inactive' || entry.cliState === 'unknown') {
        updateTabState(entry, 'session-start');
      }
      entry.lastResumeOrStartedAt = Date.now();
      break;
    case 'prompt-submit':
      updateTabState(entry, 'prompt-submit');
      if (event.prompt) {
        entry.lastUserMessage = event.prompt;
        entry.agentSummary = event.prompt.slice(0, 80);
      }
      break;
    case 'stop':
      updateTabState(entry, 'stop');
      break;
    case 'notification':
      updateTabState(entry, 'notification');
      break;
    case 'session-info':
      entry.agentSessionId = event.sessionId;
      if (event.jsonlPath) entry.jsonlPath = event.jsonlPath;
      // timeline-server에 알림
      timelineServer.notifySessionChange(tab.tmuxSession, event.jsonlPath);
      break;
    case 'message-append':
      timelineServer.broadcast(tab.tmuxSession, event.entries);
      break;
  }
};
```

### Lifecycle 통합

| 트리거 | 동작 |
| --- | --- |
| 서버 부트 | 모든 기존 탭에 `setupObserver` |
| 신규 탭 생성 | `setupObserver(tab)` |
| 탭 panelType 변경 | 기존 unsubscribe + 새 `setupObserver` |
| 탭 close | `observerCleanups.get(tab.id)?.()` + Map 삭제 |

## 6. /api/status/hook 엔드포인트 변화 (마이그 후)

```ts
// pages/api/status/hook.ts (마이그 후)
const handleCodexHook = async (req, res) => {
  const tmuxSession = req.query.tmuxSession as string;
  if (!tmuxSession) return res.status(400).json({ error: 'missing tmuxSession' });

  // Provider observer가 listen할 수 있도록 단순 forward만
  globalThis.__ptCodexHookEvents.emit('hook', tmuxSession, req.body);
  res.status(204).end();
};
```

기존 메타 갱신 + status-manager 호출 로직은 모두 observer로 이동.

## 7. 데이터 흐름 (마이그 후)

```
codex hook 발사
  ↓
~/.purplemux/codex-hook.sh
  ↓
POST /api/status/hook?provider=codex
  ↓
globalThis.__ptCodexHookEvents.emit('hook', ...)
  ↓ (provider observer listen)
codex provider observer
  ↓ translateCodexHookEvent
TAgentWorkStateEvent
  ↓ callback
status-manager.handleObserverEvent
  ↓
cliState 변경 → WebSocket push
```

## 8. 캐싱 전략

| 데이터 | 캐시 | 무효화 |
| --- | --- | --- |
| `observerCleanups` Map | status-manager 메모리 | 탭 close/변경 시 |
| Provider 인스턴스 | `getProvider()` 단일 instance | 서버 lifecycle |
| EventEmitter listener 등록 | 메모리 | unsubscribe 시 |

## 9. 에러 처리

| 에러 | 처리 |
| --- | --- |
| `attachWorkStateObserver` throw | catch + `logger.error` + 폴링 사이클 fallback (Phase 1~3 동작) |
| callback 내부 throw | observer가 catch + `logger.warn` + 다음 이벤트 정상 처리 |
| jsonl tail watcher leak (Claude) | 탭 close 시 명시 close + leak 방지 검증 |
| EventEmitter `on` 후 `off` 누락 | TypeScript strict + lifecycle hook으로 강제 |

## 10. 회귀 영향

| 영역 | 영향 |
| --- | --- |
| Phase 1~3 helper 함수 | observer 내부에서 계속 사용 (재사용) |
| `/api/status/hook` 엔드포인트 | 단순 forward만 — 기존 처리 로직 observer로 이동 |
| status-manager `updateTabFromHook` | observer callback에서 호출되도록 시그니처 유지 |
| Claude 기존 fs.watch | observer 내부로 흡수 — 외부 인터페이스 무영향 |
| timeline-server | `notifySessionChange` 신규 메서드 추가 (observer가 호출) |

## 11. 마이그 검증

| 검증 | 방법 |
| --- | --- |
| 모든 hook event가 observer 경유 | `logger.debug` traceability 추가 + 1회 검증 후 제거 |
| status-manager 직접 호출 사이트 0 | grep으로 확인 |
| EventEmitter listener 누수 0 | 30분 stress test 후 listener count 확인 |
| Phase 1~3 helper 재사용 | observer 내부 import 확인 |
