# Claude CLI 작업 상태 감지

Claude CLI의 작업 진행 상태를 서버에서 감지하고, WebSocket으로 클라이언트에 전파하여 UI 인디케이터에 반영하는 시스템.

---

## 상태 정의

### Claude 프로세스 상태 (`TClaudeStatus`)

tmux pane에서 Claude CLI 프로세스가 실행 중인지 판별하는 상태. 두 경로(터미널 WS, 타임라인 WS)에서 감지되며 `claudeStatus` 단일 필드로 통합 관리된다.

| 상태 | 의미 |
| --- | --- |
| `unknown` | 아직 감지 전 (초기값, 터미널 WS 미연결) |
| `starting` | Claude 프로세스 감지됨, 세션 미준비 (PID 파일/JSONL 아직 없음) |
| `running` | Claude 프로세스 실행 중 + 세션 확인됨 |
| `not-running` | Claude 프로세스 없음 |
| `not-initialized` | Claude CLI 설치됨, `~/.claude` 미생성 (한 번도 실행하지 않은 상태) |
| `not-installed` | Claude CLI 미설치 (바이너리 없음) |

`starting`과 `running`의 차이: `starting`은 프로세스 기반 감지(`isClaudeRunning`)로만 확인된 상태이고, `running`은 타임라인 WS에서 세션(`PID 파일 + sessionId`)까지 확인된 상태이다.

두 감지 경로:

| 경로 | 트리거 | 서버 체크 | 설정 값 |
| --- | --- | --- | --- |
| 터미널 WS `onTitleChange` | tmux 타이틀 변경 시 | `/api/check-claude` → `isClaudeRunning()` | `starting` / `not-running` |
| 타임라인 WS | 세션 파일 변경 시 | `detectActiveSession()` | `running` / `not-running` |

동일 `claudeStatus` 필드에 쓰며, `claudeStatusCheckedAt` 서버 타임스탬프로 stale 업데이트를 방지한다.

#### 상태 전환 가드

`setClaudeStatus`에서 다음 전환을 차단한다:

| 차단 전환 | 이유 |
| --- | --- |
| `running` → `starting` | `running`이 상위 상태 (세션 확인됨), 다운그레이드 방지 |

추가로 `onSync` 콜백(claude-code-panel, mobile-claude-code-panel)에서 다음을 차단한다:

| 차단 전환 | 이유 |
| --- | --- |
| `starting` → `not-running` (타임라인 경유) | 프로세스는 감지됐지만 세션 아직 미준비, check-claude 경유의 `not-running`은 허용 |

### CLI 작업 상태 (`TCliState`)

Claude가 실행 중일 때의 작업 진행 상태. **Claude Code Hook이 유일한 진실의 출처**이며, hook 이벤트의 결정적 파생식(`deriveStateFromEvent`)으로 결정된다.

| 상태 | 의미 |
| --- | --- |
| `busy` | 사용자가 Claude에 작업을 요청했고 응답을 기다리는 중 (`prompt-submit` 훅) |
| `idle` | Claude가 응답을 완료하고 다음 입력을 기다리는 중 (사용자 확인됨) |
| `ready-for-review` | Claude가 응답을 완료했으나 사용자가 아직 확인하지 않음 (`stop` 훅) |
| `needs-input` | Claude가 작업 중 사용자 입력을 기다리는 상태 (`notification` 훅, 권한 프롬프트 포함) |
| `unknown` | 서버 재시작 전 `busy`였던 탭 — 훅 유실 가능성으로 상태 확정 불가. 다음 훅 수신 또는 background probe로 승격 |
| `inactive` | Claude 프로세스가 실행되지 않는 상태 |
| `cancelled` | 클라이언트 측 로컬 상태, 사용자가 작업을 취소함 |

전이 규칙은 순수함수 `deriveStateFromEvent(lastEvent, fallback)`로 표현된다:

```ts
session-start → idle
prompt-submit → busy
notification  → needs-input
stop          → ready-for-review
```

예외: `prevState`가 `inactive`/`cancelled`이면 훅이 와도 그대로 유지.

`ready-for-review` → `idle` 전환은 **오직 `dismissTab` 액션**으로만 발생 (사용자가 탭을 포커스하거나 dismiss 버튼 클릭 시).

### 탭 표시 상태 (`TTabDisplayStatus`)

`cliState`에서 직접 매핑:

| cliState | 표시 상태 | UI |
| --- | --- | --- |
| `busy` | `busy` | 스피너 |
| `ready-for-review` | `ready-for-review` | 보라색 점 (펄스) |
| `needs-input` | `needs-input` | 황색 점 (펄스) |
| `unknown` | `unknown` | 회색 점 (정적) |
| `idle` | `idle` | 표시 없음 |
| `inactive` | `idle` | 표시 없음 |

### 세션뷰 (`TSessionView`)

Claude 패널에서 어떤 화면을 보여줄지 결정하는 파생 상태.

| 상태 | 의미 | 결정 조건 |
| --- | --- | --- |
| `loading` | 타임라인 로딩 중 | `claudeStatus === 'starting'`, 또는 `claudeStatus === 'running' && isTimelineLoading`, 또는 `isResuming` |
| `restarting` | 새 대화 생성 중 | `isRestarting === true` |
| `not-installed` | Claude CLI 미설치 | `claudeStatus === 'not-installed'` |
| `timeline` | 타임라인 표시 | `claudeStatus === 'running' && !isTimelineLoading` |
| `inactive` | Claude 미실행 | 위 어디에도 해당하지 않음 (`not-initialized`, `not-running` 포함) |

`inactive`일 때 컴포넌트에서 `sessions.length`로 세션 목록/빈 화면을 분기한다.

---

## 탭 스토어 (`useTabStore`)

모든 탭 상태를 `Record<tabId, ITabState>`로 관리하는 Zustand 스토어.

### 필드

| 필드 | 타입 | 소스 | 용도 |
| --- | --- | --- | --- |
| `terminalConnected` | `boolean` | 터미널 WS status | 입력 가능 여부 판단, `claudeStatus` 신뢰성 가드 |
| `claudeStatus` | `TClaudeStatus` | 터미널 WS + 타임라인 WS | 세션뷰 결정, 프로세스 감지 |
| `claudeStatusCheckedAt` | `number` | 서버 타임스탬프 | stale 업데이트 방지 |
| `cliState` | `TCliState` | 타임라인 entries 파생 / 서버 폴링 | 작업 상태, 탭 인디케이터 |
| `isTimelineLoading` | `boolean` | 타임라인 WS init 수신 여부 | 세션뷰 `loading` 분기 |
| `isRestarting` | `boolean` | 사용자 새 대화/재시작 액션 | 세션뷰 `restarting` 분기 |
| `isResuming` | `boolean` | 세션 resume 액션 | 세션뷰 `loading` 분기 |
| `workspaceId` | `string` | 서버 StatusManager | 워크스페이스별 탭 필터링 |

### 쓰기 경로

| 경로 | setter | 특성 |
| --- | --- | --- |
| 서버 (status WS) | `syncAllFromServer`, `updateFromServer`, `applyHookEvent` | 서버가 유일한 authority, 직접 patch |
| 사용자 액션 | `dismissTab` | `ready-for-review → idle` 전환 (클라 측 optimistic, WS 메시지로 서버 반영) |
| 사용자 액션 | `cancelTab` | 클라 측 `cancelled` 상태 (UI 전용) |

클라이언트는 **`cliState`를 서버로 역전파하지 않는다**. `notifyCliState`/`status:cli-state` WS 메시지 경로는 Phase 4에서 제거됨.

### `isCliIdle()` 헬퍼

`idle`과 `ready-for-review` 모두 "작업 대기 중"을 의미하므로, idle-like 판단이 필요한 곳에서 사용:

```typescript
export const isCliIdle = (cliState: TCliState): boolean =>
  cliState === 'idle' || cliState === 'ready-for-review';
```

사용처: `WebInputBar` 입력 모드, `QuickPromptBar` 활성화, 재시작 완료 감지, dismiss-on-focus.

---

## 상태 판별 로직

### 이벤트 기반 모델

`cliState`는 **Hook 이벤트의 파생값**이다. 다른 휴리스틱(JSONL idle 판정, pane capture, 터미널 활동 시각 등)은 더 이상 `cliState` 결정에 쓰이지 않는다.

서버의 `StatusManager.updateTabFromHook`이 훅 수신 시:

1. `entry.eventSeq` 증가, `entry.lastEvent = { name, at, seq }` 저장
2. `status:hook-event` WS 메시지로 broadcast (seq + name + at)
3. `deriveStateFromEvent(entry.lastEvent, prevState)`로 새 cliState 결정
4. `prevState !== newState`면 `applyCliState` 호출 (idempotent 가드 내장)

같은 상태로의 재진입(예: `needs-input → needs-input`, 연속 권한 프롬프트)도 `lastEvent.seq`가 증가하므로 클라이언트는 `status:hook-event`를 받아 반응한다. 예를 들어 `PermissionPromptItem`은 `lastEvent.seq`를 `useEffect` dep로 구독해 새 옵션을 재fetch한다.

### JSONL 기반 메타데이터 (cliState 아님)

JSONL 파일은 여전히 `currentAction`(도구 호출 요약)과 `lastAssistantMessage`(응답 미리보기)를 얻는 데 쓰인다. 하지만 이것들은 **cliState 결정에는 영향 없다**.

`StatusManager.readTabMetadata`가 새 탭 최초 로드 시 1회 호출되고, `jsonlWatchers`가 `busy`/`needs-input` 탭의 JSONL 파일을 감시하여 메타데이터를 갱신한다. JSONL watcher는 `ready-for-review` 승격 경로를 **더 이상 사용하지 않는다** — 이제 `stop` 훅만이 `ready-for-review` 전이를 발사한다.

### 서버 재시작 정책

서버 재시작 시 훅이 유실될 수 있는 유일한 상태는 `busy`다 (Claude가 서버 다운 중 stop/notification을 발사했을 수 있음). 다른 상태는 "공이 사용자 코트에" 있어 자동 전이가 발생하지 않으므로 persisted 값 그대로 유지.

`scanAll`에서:

| persisted cliState | 재시작 후 |
| --- | --- |
| `busy` | **`unknown`** → `resolveUnknown` 스케줄 |
| 그 외 | 그대로 유지 |

### `resolveUnknown` — unknown 탭의 백그라운드 복구

`busy → unknown`으로 변환된 탭에 대해 다음 확실한 신호만 사용하여 정상 상태로 승격을 시도:

1. **Claude 프로세스 검사** — `isClaudeRunning(panePid)` 실패 → `idle` 확정 (silent, 푸시 없음)
2. **JSONL tail 검사** — `checkJsonlIdle`이 `idle && !stale && lastAssistantSnippet`을 반환 → `ready-for-review` 확정 (silent)
3. **그 외** → `unknown` 유지, 다음 훅 대기

**pane capture는 사용하지 않는다.** 스크롤백에 남아 있는 이전 권한 프롬프트를 현재 프롬프트로 오판할 위험이 있기 때문.

### Busy 교착 안전망

운영 중 `busy` 상태가 `BUSY_STUCK_MS`(**10분**) 이상 지속되고 Claude 프로세스가 사라져 있으면 `idle`로 silent 복구. 메타데이터 poll 루프 내에서 수행한다. 훅 유실(SIGKILL 등) 대비용.

### ready-for-review / needs-input 보호 불변식

- `ready-for-review` → `idle`은 **오직 `dismissTab`**으로만 발생
- Hook 이벤트는 `prevState`에 관계없이 파생식을 따르지만, `inactive`/`cancelled`는 전이 대상 아님

`applyCliState`는 함수 상단에 `if (prevState === newState) return` idempotent 가드가 있어, 중복 호출이나 실수로 인한 부수효과(푸시 중복 등)를 방어한다.

---

## Claude Code Hook 시스템

Claude Code의 [Hook](https://docs.anthropic.com/en/docs/claude-code/hooks) 기능을 활용하여, JSONL 폴링만으로는 감지가 늦는 상태 변화를 즉시 반영한다.

### Hook 설정

서버 시작 시 `ensureHookSettings()`가 `~/.purplemux/hooks.json`을 생성한다. Claude Code는 이 파일을 프로젝트 레벨 Hook 설정으로 인식한다.

| 파일 | 용도 |
| --- | --- |
| `~/.purplemux/hooks.json` | Hook 이벤트 → shell 스크립트 매핑 |
| `~/.purplemux/status-hook.sh` | Hook 실행 시 서버로 POST 전송하는 스크립트 |
| `~/.purplemux/port` | 현재 서버 포트 (스크립트에서 참조) |

### Hook 이벤트

| Claude Code Hook | 전송 이벤트 | 용도 |
| --- | --- | --- |
| `SessionStart` | `session-start` | Claude 세션 시작 감지 |
| `UserPromptSubmit` | `prompt-submit` | 사용자 입력 제출 → busy 전환 |
| `Notification` | `notification` | Claude가 사용자 입력을 기다리는 상태 감지 |
| `Stop` | `stop` | Claude 작업 완료 |
| `StopFailure` | `stop` | Claude 작업 실패 (Stop과 동일 처리) |

### Hook 스크립트 동작

```bash
#!/bin/sh
EVENT="${1:-poll}"
PORT_FILE="$HOME/.purplemux/port"
[ -f "$PORT_FILE" ] || exit 0
PORT=$(cat "$PORT_FILE")
SESSION=$(tmux display-message -p '#{session_name}' 2>/dev/null) || SESSION=""
curl -s -X POST -o /dev/null \
  -H 'Content-Type: application/json' \
  -d "{\"event\":\"${EVENT}\",\"session\":\"${SESSION}\"}" \
  "http://localhost:${PORT}/api/status/hook" 2>/dev/null
exit 0
```

tmux 세션 이름을 함께 전송하여 서버가 어떤 탭에서 발생한 이벤트인지 식별한다.

### Hook API 엔드포인트 (`/api/status/hook`)

localhost 연결만 허용 (보안). `event`와 `session`을 수신하여 `StatusManager.updateTabFromHook()`을 호출한다. `event`가 `poll`이거나 `session`이 없으면 전체 폴링을 트리거한다.

### Hook 상태 전환 (`updateTabFromHook`)

`deriveStateFromEvent`가 순수 함수로 전이 규칙을 표현한다:

| 이벤트 | 새 cliState |
| --- | --- |
| `session-start` | `idle` |
| `prompt-submit` | `busy` |
| `notification` | `needs-input` |
| `stop` | `ready-for-review` |

예외: `prevState`가 `inactive`/`cancelled`이면 훅 무시.

#### 이벤트 섀도잉 (`status:hook-event`)

훅 수신 시 서버는 `entry.lastEvent`를 갱신하고 **별도의 `status:hook-event` WS 메시지**로 원본 이벤트(`name`, `at`, `seq`)를 broadcast한다. `cliState`가 바뀌지 않아도(예: `needs-input → needs-input`) 이 메시지는 항상 발사된다.

클라이언트는 `applyHookEvent(tabId, event)` 액션으로 이 메시지를 처리하며, `event.seq <= prev.eventSeq`이면 역전 방지로 drop한다.

`PermissionPromptItem`은 `lastEvent.seq`를 `useEffect` dep로 구독하여 연속 notification 시 자동으로 새 옵션을 재fetch한다.

```
연속 권한 프롬프트:
prompt-submit → lastEvent{name:'prompt-submit', seq:1} → busy
notification  → lastEvent{name:'notification', seq:2}  → needs-input
사용자 선택
notification  → lastEvent{name:'notification', seq:3}  → needs-input (same, seq++)
stop          → lastEvent{name:'stop', seq:4}          → ready-for-review
```

#### `stop` 승격 단순화

Phase 2부터 `stop`은 **언제나** `ready-for-review`로 승격한다(예외: `inactive`/`cancelled`). 이전의 "`busy`/`needs-input`에서만 승격" 조건문은 제거됨. Claude가 발사한 `stop`은 정의상 "방금 완료"를 의미하므로 항상 review 대상.

### 관련 파일

| 파일 | 설명 |
| --- | --- |
| `src/lib/hook-settings.ts` | Hook 설정 파일 생성, 스크립트 관리 |
| `src/pages/api/status/hook.ts` | Hook API 엔드포인트 |
| `src/lib/status-manager.ts` | `updateTabFromHook()`, Grace Period 로직 |

---

## 데이터 흐름

```
[Claude Code Hook] ~/.purplemux/status-hook.sh → /api/status/hook
  │  session-start / prompt-submit / notification / stop
  │
  └─ StatusManager.updateTabFromHook(session, event)
      ├─ lastEvent 기록 + eventSeq 증가
      ├─ status:hook-event broadcast (name + at + seq)
      ├─ deriveStateFromEvent → newState
      └─ prevState !== newState면
          ├─ applyCliState (idempotent)
          ├─ persistToLayout
          └─ status:update broadcast
          │
          ▼
[JSONL Watch] status-manager.ts
  │  busy/needs-input 탭의 JSONL 파일에 fs.watch
  │  100ms 디바운스, 파일 변경 시 checkJsonlIdle 호출
  │
  ├─ 시작: busy/needs-input 전이 시
  ├─ 해제: needs-input 해제 또는 탭 삭제, shutdown
  └─ currentAction/lastAssistantSnippet 변경 시 status:update broadcast
      (cliState는 건드리지 않음 — Phase 3에서 ready-for-review 승격 경로 제거)
      │
      ▼
[메타데이터 Poll] status-manager.ts
  │  30~60초 간격 (탭 수에 따라), cliState 판정 없음
  │
  ├─ 신규 탭 발견 → readTabMetadata 1회 + entry 생성
  │    persisted cliState === 'busy' → 'unknown'으로 변환, resolveUnknown 스케줄
  ├─ 기존 탭 → process/ports/title/summary 갱신만
  ├─ busy 교착 검사 → 10분 경과 + Claude 프로세스 사망이면 silent idle
  └─ 삭제된 탭 → cleanup + broadcastRemove
      │
      ▼
[Status WebSocket] status-server.ts (/api/status)
  │  서버 → 클라이언트: status:sync, status:update, status:hook-event
  │  클라이언트 → 서버: status:tab-dismissed, status:request-sync
  │
  ▼
[Zustand 스토어] use-tab-store.ts
  │
  │  syncAllFromServer / updateFromServer (메타데이터)
  │  applyHookEvent (lastEvent/eventSeq, seq 역전 방지)
  │
  ├─ selectTabDisplayStatus(tabs, tabId)     → TTabDisplayStatus
  ├─ selectSessionView(tabs, tabId)          → TSessionView
  ├─ selectWorkspaceStatus(tabs, wsId)       → { busyCount, attentionCount }
  └─ selectGlobalStatus(tabs)                → { busyCount, attentionCount }
      │
      ▼
[UI 컴포넌트]
  ├─ TabStatusIndicator          탭 바 (각 탭 옆)
  ├─ WorkspaceStatusIndicator    사이드바 (워크스페이스 옆)
  ├─ PermissionPromptItem        타임라인, lastEvent.seq로 options 재fetch
  ├─ NotificationSheet           알림 시트 (진행중/리뷰/완료 목록)
  ├─ Bell 아이콘                  사이드바 + 앱 헤더 (fill 상태, 배지)
  └─ useBrowserTitle             브라우저 탭 제목 (N) purplemux
```

### 터미널 WS 경로 (프로세스 감지)

```
tmux 타이틀 변경 → onTitleChange
  │  lastTitleRef로 중복 호출 방지
  │
  ├─ formatTabTitle() → 탭 표시명 업데이트
  └─ fetch /api/check-claude
      └─ isClaudeRunning(panePid) → { running, checkedAt }
          └─ setClaudeStatus(tabId, running ? 'starting' : 'not-running', checkedAt)
```

### 타임라인 WS 경로 (세션 + 작업 상태)

```
타임라인 WS 연결 → detectActiveSession()
  │
  ├─ session-changed 메시지 → claudeStatus 설정
  ├─ timeline:init 메시지 → entries 수신, isTimelineLoading = false
  └─ timeline:append 메시지 → entries 추가
      │
      └─ useTimeline onSync 콜백
          ├─ setClaudeStatus(tabId, status, Date.now())
          │    ※ 현재 starting이고 incoming이 not-running이면 무시
          ├─ setCliState(tabId, cliState)    ← 여기서 ready-for-review 승격
          └─ setTimelineLoading(tabId, loading)
```

---

## 폴링 주기

Phase 3부터 **메타데이터 전용** 폴링이며, `cliState`에는 관여하지 않는다.

| 탭 수 | 간격 |
| --- | --- |
| 1~10개 | 30초 |
| 11~20개 | 45초 |
| 21개+ | 60초 |

### 폴링 1회당 비용

| 작업 | 횟수 |
| --- | --- |
| `tmux list-panes -a` | 1회 (전체 일괄) |
| 파일시스템 읽기 (workspace/layout JSON) | 워크스페이스 수 + α |
| `pgrep -P` | busy 교착 검사에 걸린 탭 수만 |
| `ps -p` | 매칭된 PID 수 |
| JSONL 파일 tail 읽기 (8KB) | 신규 탭 발견 시 1회 (기존 탭은 watcher 경로) |

`cliState` 판정과 `hasPermissionPrompt` 검사가 제거되어 폴링 비용이 Phase 2 대비 ~80% 감소.

---

## 관련 파일

### 타입

| 파일 | 설명 |
| --- | --- |
| `src/types/status.ts` | `ITabStatusEntry`, `TTabDisplayStatus`, WebSocket 메시지 타입 |
| `src/types/timeline.ts` | `TCliState`, `TClaudeStatus` |

### 서버

| 파일 | 설명 |
| --- | --- |
| `src/lib/status-manager.ts` | `deriveStateFromEvent`, `updateTabFromHook`, `applyCliState`, `resolveUnknown`, `readTabMetadata`, busy 교착 안전망, 메타데이터 poll, JSONL watch |
| `src/lib/status-server.ts` | `/api/status` WebSocket 핸들러 (`tab-dismissed`, `request-sync`) |
| `src/lib/hook-settings.ts` | Hook 설정 파일(`hooks.json`) 생성, 스크립트(`status-hook.sh`) 관리 |
| `src/pages/api/status/hook.ts` | Hook API 엔드포인트 (localhost only, `updateTabFromHook` 호출) |
| `src/lib/session-detection.ts` | `detectActiveSession`, `isClaudeRunning`, `watchSessionsDir` |
| `src/pages/api/check-claude.ts` | Claude 프로세스 감지 API (터미널 onTitleChange에서 호출) |
| `server.ts` | StatusManager 초기화, Hook 설정 초기화(`ensureHookSettings`), WebSocket 라우팅 |

### 클라이언트

| 파일 | 설명 |
| --- | --- |
| `src/hooks/use-tab-store.ts` | Zustand 탭 스토어, `applyHookEvent`, 파생 selectors, `isCliIdle` 헬퍼 |
| `src/hooks/use-claude-status.ts` | Status WebSocket 연결, `status:hook-event` 처리, `dismissTab` |
| `src/hooks/use-timeline.ts` | 타임라인 WS 데이터 (cliState 파생은 로컬 restart 감지용으로만 사용) |
| `src/hooks/use-browser-title.ts` | 브라우저 타이틀에 attention 카운트 반영 |

### UI 컴포넌트

| 파일 | 위치 |
| --- | --- |
| `src/components/features/terminal/tab-status-indicator.tsx` | 탭 바 |
| `src/components/features/terminal/workspace-status-indicator.tsx` | 사이드바 |
| `src/components/features/terminal/notification-sheet.tsx` | 알림 시트 + `useNotificationCount` 훅 |

### 통합 지점

| 파일 | 사용 컴포넌트 |
| --- | --- |
| `src/components/features/terminal/pane-tab-bar.tsx` | `TabStatusIndicator` |
| `src/components/features/terminal/workspace-item.tsx` | `WorkspaceStatusIndicator` |
| `src/components/features/mobile/mobile-workspace-tab-bar.tsx` | `selectTabDisplayStatus` |
| `src/components/features/terminal/sidebar.tsx` | `useNotificationCount` (Bell 아이콘) |
| `src/components/layout/app-header.tsx` | `useNotificationCount` (Bell 아이콘) |
| `src/pages/_app.tsx` | `useClaudeStatus()` 전역 초기화 |

---

## 알림 시스템

### 알림 시트 (`NotificationSheet`)

Bell 아이콘 클릭 시 Sheet로 표시. 진행중(`busy`), 입력 대기(`needs-input`), 리뷰(`ready-for-review`), 완료(`done`) 네 섹션.

완료 섹션은 `dismissTab`으로 확인된 탭(`dismissedAt` 값이 있고 `cliState`가 `idle`/`inactive`인 탭) 중 현재 활성 탭을 제외하여 최신순으로 표시한다. 해당 탭에서 새 작업이 시작되면(`busy` 전환) `dismissedAt`이 초기화되어 목록에서 제거된다.

### 활성 탭 제외 로직

현재 보고 있는 탭은 이미 사용자가 인지하고 있으므로 알림 목록과 아이콘 카운트에서 제외한다.

| 페이지 | 제외 대상 |
| --- | --- |
| 터미널 (`/`) | 현재 활성 pane의 activeTabId |
| 그 외 (노트, 통계 등) | 없음 (전체 포함) |

`useNotificationCount` 훅이 이 로직을 캡슐화하며, 알림 시트·사이드바 Bell·앱 헤더 Bell이 동일한 카운트를 공유한다.

### 알림 항목 데이터

| 필드 | 소스 | 설명 |
| --- | --- | --- |
| `workspaceName` | `useWorkspaceStore` | 워크스페이스 이름 |
| `lastUserMessage` | `ITab.lastUserMessage` (레이아웃 JSON) | 마지막 사용자 메시지 |
| `busySince` | `ITabStatusEntry.busySince` | busy 상태 진입 시점 |
| `readyForReviewAt` | `ITabStatusEntry.readyForReviewAt` | ready-for-review 전환 시점 |
| `dismissedAt` | `ITabStatusEntry.dismissedAt` | dismiss(확인) 시점 — 완료 섹션 표시 기준 |

`lastUserMessage`는 타임라인 서버에서 `user-message` 엔트리 수신 시 레이아웃 JSON에 저장(`updateTabLastUserMessage`). 상태 매니저 폴링 시 레이아웃에서 읽어 클라이언트로 전파.
