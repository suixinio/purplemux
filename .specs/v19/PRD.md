# v19 요구사항 정리

## 출처

- `.specs/v19/requirements/codex.md` — OpenAI Codex CLI를 두 번째 provider로 도입하기 위한 상세 설계

## 작업 단위 (도출)

v19은 페이지 추가가 아닌 **provider 추상 계층 위에 두 번째 CLI 통합**. v18까지 작업한 `IAgentProvider` 추상이 첫 검증을 받는 단계.

| 작업 단위 | 설명 | 우선순위 | Phase |
| --- | --- | --- | --- |
| Codex provider 코어 | `providers/codex/` 모듈 7개 (index/session-detection/preflight/client/work-state-observer/prompt/hook-config). `IAgentProvider` 슬롯 채우기. transcript 파서 제외. | P0 | 1 |
| Hook 인프라 | `~/.purplemux/codex-hook.sh` 부트 시 작성. 사용자 `~/.codex/config.toml` 머지 후 `-c hooks.<E>=[...]` 인자 발사. 4개 이벤트(SessionStart/UserPromptSubmit/Stop/PermissionRequest). | P0 | 1 |
| Hook endpoint 어댑터 | `/api/status/hook?provider=codex&tmuxSession=...` 분기. payload → `TAgentWorkStateEvent` 변환 + entry 메타 갱신. SessionStart 동시성 보정. | P0 | 1 |
| TUI ready 감지 | 3-layer (process + pane title + composer 마커 `›`) 체크 → synthetic SessionStart 발사. | P0 | 1 |
| Status 보강 | poll loop에서 `isAgentRunning` false면 cliState='inactive' 복귀. send-keys 분리 헬퍼. `matchesProcess(cmd, args?)` 시그니처 확장. | P0 | 1 |
| Preflight 통합 | `IPreflightResult.codex` 필드 추가. Codex optional (`isRuntimeOk` 영향 없음). | P0 | 1 |
| Codex 패널 UI | `CodexPanel`/`MobileCodexPanel` (ClaudeCodePanel 거의 복사 + placeholder timeline). `OpenAIIcon` 재사용. | P0 | 1.5 |
| 메뉴/단축키 | "Codex 새 대화"/"세션 목록" 메뉴 항목. `view.mode_codex` = `Cmd+Shift+X`. agent 전환 잠금 규칙. | P0 | 1.5 |
| Session list (codex) | `~/.codex/sessions/YYYY/MM/DD/*.jsonl` 디렉토리 스캔 + 첫 줄 SessionMeta 추출. cwd 필터. | P0 | 1.5 |
| 권한 응답 UI | PermissionRequest hook → UI Yes/No → send-keys `y`/`n` (Codex default keymap). | P0 | 1.5 |
| jsonl 파서 + 타임라인 | `RolloutItem` 태그 유니온 → `ITimelineEntry`. CodexPanel placeholder 제거. | P1 | 2 |
| stats / session-history / observer 통합 | claude-tokens.ts 일반화, notification-sheet 일반화, attachWorkStateObserver 정식 구독. | P1 | 2 |

## 주요 요구사항

### 1. Codex provider 코어 (Phase 1)

- `IAgentProvider` 인터페이스 그대로 채움 — Step 1~5 추상이 첫 사용자 받음
- 신규 panelType: `'codex-cli'`
- Provider id: `'codex'`
- 세션 ID: UUID (Claude와 동일 정규식)
- ITab legacy 필드 추가 안 함 — `agentState`만 사용 (Codex는 새 provider라 디스크 호환 데이터 없음)
- `matchesProcess(cmd, args?)` 시그니처 확장 — 두 provider 모두 `node`가 직접 자식이라 args(`claude.js` vs `codex.js`)로 disambiguation
- 프로세스 트리: `shell → node (codex.js shim) → codex (Rust binary)` 2단계 — 기존 grandchild walk 재사용

### 2. 시스템 프롬프트 주입 (Phase 1)

- `-c developer_instructions="$(cat <path>)"` inline TOML 주입
- 사용자 `~/.codex/{config.toml, AGENTS.md, auth.json}` 일체 미변경
- developer_instructions는 **append** (기본 시스템 프롬프트 보존)
- 워크스페이스 디렉토리에 `codex-prompt.md` 작성, 매 launch마다 inline 주입
- TOML triple-quoted literal 사용 (`'''...'''`), prompt 내용에 `'''` sanitize
- 인자 길이 ARG_MAX(256KB+) 한참 아래

### 3. Hook 등록 + 페이로드 (Phase 1)

- `-c hooks.<Event>=[{matcher=".*", hooks=[{type="command", command="..."}]}]` 형태로 4개 이벤트 등록
- 등록 이벤트: `SessionStart`, `UserPromptSubmit`, `Stop`, `PermissionRequest` (PreToolUse/PostToolUse는 Phase 2)
- Hook 명령은 `~/.purplemux/codex-hook.sh` 단일 스크립트 (서버 부트 시 mode 0700 작성)
- 스크립트 동작: `tmux display-message`로 tmux session 추출 → stdin JSON에 추가하여 `/api/status/hook?provider=codex&tmuxSession=...`로 forward
- 인증 헤더 `x-pmux-token` (Claude와 통일)
- 사용자 config 머지: `[...ourEntries, ...userEntries]` 순서, async=true라 안전
- 사용자 config 파싱 실패 시 graceful (우리 entry만 적용)
- TOML 직렬화: SDK의 `toTomlValue` 패턴 (JSON.stringify로 escape) + shellQuote 단일따옴표 wrap

### 4. TUI ready 감지 + cliState 진입 (Phase 1)

- **핵심 문제**: Codex SessionStart hook은 사용자 첫 메시지 후 발사 (`turn.rs:299`). 그 전엔 cliState='inactive' → WebInputBar 비활성 → 첫 메시지 못 보냄 → dead state
- **3-layer 감지** (모두 만족 시 synthetic SessionStart):
  - Layer 1: `provider.isAgentRunning(panePid)` true (codex Rust 자식 검출)
  - Layer 2: pane title이 shell-style 아님 (OSC 0 발사 = SessionConfigured 통과)
  - Layer 3: pane content에 composer 마커 `›` (U+203A) 또는 `!` (bash 모드)
- 모두 통과 + cliState='inactive'면 `updateTabFromHook(session, 'session-start')` synthetic 발사
- false positive 회피, idempotent 체크 불필요 (한 번 'idle' 가면 분기 안 들어감)
- 페인 콘텐츠 캡처 비용은 cliState='inactive'일 때만 발생 → 무시 가능

### 5. Status 보강 (Phase 1)

- **Agent 종료 복귀**: poll 사이클마다 `isAgentRunning` false && cliState ≠ 'inactive'/'unknown'면 'inactive'로 전환. Claude/Codex 공통 — 기존 잠재 버그 명시적 처리.
- **send-keys 분리**: `tmux send-keys cmd Enter`는 atomic PTY write라 codex가 줄바꿈으로 오인. `sendKeysSeparated(session, cmd)` 헬퍼 — text 후 50ms 후 별도 Enter. WebInputBar/auto-resume 모두 적용.
- **`matchesProcess(cmd, args?)` 시그니처 확장**: `getProviderByProcessName` 호출 사이트 (`auto-resume.ts:62` 등)에 args 전달.

### 6. Codex 어댑터 — 메타 갱신 + 동시성 보정 (Phase 1)

```ts
// /api/status/hook?provider=codex 핸들러
entry.agentProviderId = 'codex';
entry.agentSessionId = payload.session_id;  // 모든 SessionStart에서 갱신 (clear/resume 자동 처리)
if (payload.transcript_path) entry.jsonlPath = payload.transcript_path;  // null guard
if (payload.hook_event_name === 'UserPromptSubmit' && payload.prompt) {
  entry.lastUserMessage = payload.prompt;
  entry.agentSummary = payload.prompt.slice(0, 80);
}

// SessionStart는 cliState 'inactive'/'unknown' 때만 idle 전환 (busy↔idle 회귀 방지)
if (eventName === 'session-start') {
  if (entry.cliState === 'inactive' || entry.cliState === 'unknown') {
    statusManager.updateTabFromHook(tmuxSession, 'session-start');
  }
} else if (eventName) {
  statusManager.updateTabFromHook(tmuxSession, eventName);
}
```

### 7. 미설치 격리 (Phase 1)

- Codex는 optional. 미설치 환경에서 Claude만 정상 동작 보장
- `IPreflightResult.codex.installed` 결과 따라 UI 메뉴 disabled (tooltip 안내)
- auto-resume에서 codex 탭 발견 시 preflight check, 미설치면 skip + log
- `isRuntimeOk`에 codex 포함 안 함 (Codex 미설치라도 통과)

### 8. UI 1급 시민화 (Phase 1.5)

- `CodexPanel`/`MobileCodexPanel` — `ClaudeCodePanel` 거의 복사 + placeholder timeline
- `OpenAIIcon` (기존 svg 컴포넌트) 재사용. 상태 인디케이터는 Claude와 동일 원형
- 메뉴: "Codex 새 대화" / "Codex 세션 목록" 항목 (`pane-new-tab-menu`)
- 단축키: `view.mode_codex` = `Cmd+Shift+X`
- agent 전환 잠금 규칙: agent 실행 중 + 다른 agent로 전환 시도면 토스트 + 차단
- 세션 목록: `listCodexSessions({ cwd })` — 워크스페이스 cwd 기준 필터

### 9. 권한 응답 (Phase 1.5)

- Codex default approval keys (`codex-rs/tui/src/keymap.rs:509-513`): `y` (approve), `a` (session), `p` (prefix), `d` (deny), `n`/`Esc` (decline)
- 단일 글자, Enter 불필요 (Claude의 `1\r`/`2\r`과 다름)
- Phase 1.5 매핑: "Yes" → `y`, "No" → `n` (default keymap 가정. 사용자 keymap 커스터마이즈 인지는 Phase 2)

## 제약 조건 / 참고 사항

### 코드베이스 가이드 준수
- `AGENTS.md`: Next.js 16, Pages Router, pnpm, Tailwind v4, shadcn/ui, TypeScript
- `CLAUDE.md` 규칙 14 — 직접 `ps`/`pgrep`/`lsof` 호출 금지, 기존 `process-utils.ts` 함수 재사용
- `CLAUDE.md` 규칙 18 — 모듈 격리(`globalThis.__pt*`)는 신규 모듈에 적용

### 성능
- 폴링 사이클: 30s/45s/60s (탭 수에 따라). Codex 추가로 변동 없음.
- `capturePaneAtWidth`(수십 ms)는 cliState='inactive' + Layer 1+2 통과 후만 호출 → 활성 codex 탭 평균 1-2회/사이클
- ARG_MAX 256KB+ vs 우리 인자 ~3KB → 한참 여유

### 보안/생명주기
- `~/.purplemux/codex-hook.sh` mode 0700
- `~/.purplemux/cli-token` mode 0600 (검증 필요)
- `/api/status/hook` localhost 바인딩 (검증 필요)
- 사용자 config 파싱은 trusted (외부 입력 아님)

### UX 완성도 (토스급 관점)
- TUI ready 감지에서 1-2초 대기는 사용자에게 "버튼 비활성" 형태로 보임. **로딩 indicator 표시** 권장 (CodexPanel session 체크 화면 활용).
- agent 전환 잠금 토스트는 친절한 메시지("현재 실행 중인 CLI를 먼저 종료하세요").
- 권한 요청 도착 시 즉각적인 visual cue (파란 띠/아이콘 깜박임 등) — 현재 `[ ! ] Action Required` 페인 타이틀 외에 패널 자체에서도 강조.
- 세션 목록은 시작 시간/cwd/첫 user message 미리보기 같이 — 사용자가 어떤 세션인지 빠르게 식별.

### Codex 미설치 시 UX
- 메뉴 disabled 상태에서 단순히 회색이 아닌, 클릭 시 설치 안내 토스트
- preflight 페이지에서 Codex 영역 명확히 (Claude와 시각적 동일 트리트먼트)

## 미확인 사항

### Phase 1 즉시 검증 필요
- [ ] `purplemux/cli-token` 파일 권한이 실제 0600인지 (security spec 검증)
- [ ] `/api/status/hook` 엔드포인트가 localhost-only 바인딩인지
- [ ] auto-resume의 `SHELL_READY_DELAY_MS = 500ms`가 codex Rust binary 부팅에 충분한지 실측 (npm shim 거치면 1초+ 가능)
- [ ] `tmux send-keys cmd Enter`가 정말 atomic PTY write인지 (분리 정책 근거 재검증)
- [ ] composer 마커 `›` 검출이 사용자 zsh 테마(oh-my-zsh의 `›` 사용 케이스)와 충돌하지 않는지

### 품질 격상 (TOP 10 기업 수준)
- [ ] **Codex 토큰 사용량 추적** — Phase 2로 미뤘지만 유료 사용자에게 중요. jsonl `event_msg`에서 token usage 파싱 가능한지 검증 필요. stats 페이지에서 Claude/Codex 통합 차트.
- [ ] **다중 provider 동시 detection 성능** — 한 워크스페이스에 Claude + Codex 탭 다수일 때 폴링 비용 측정. 폴링 사이클 동적 조정 정책 검토.
- [ ] **세션 검색/필터링** — Codex `~/.codex/sessions/YYYY/MM/DD/`는 일자 파티셔닝이라 양 많은 사용자(수개월)는 디렉토리 스캔 비용 큼. SQLite state DB 활용 옵션 재평가 (Phase 1 결정은 디렉토리 스캔, 성능 issue 시 Phase 2 재고).
- [ ] **사용자 keymap 인지** — Phase 1.5는 default approval keys(`y`/`n`) 가정. 사용자가 `~/.codex/config.toml`에 `[keymap.approval]` 변경 시 응답 키 매핑 어긋남. 자기 keymap 인지하는 mechanism Phase 2.
- [ ] **에러 표면화** — codex 명령 실행 실패, hook script 권한 오류, smol-toml 파싱 실패 등 에러 케이스가 사용자에게 어떻게 보이는지. 토스트/배지 정책.

### 사용자 시나리오 검증 필요
- [ ] codex `/clear` 후 새 session_id로 갈아끼우는 흐름 (현재 명세는 모든 SessionStart에서 session_id 갱신 → 자동 처리되어야 함)
- [ ] codex `/quit` 또는 Ctrl+D 후 cliState='inactive' 복귀 (Claude도 같은 시나리오로 회귀 검증)
- [ ] 사용자가 자체 hook(예: `code-notify`) 등록한 환경에서 우리 머지 동작
- [ ] auto-resume 직후 잠깐 process 미감지 윈도우가 inactive로 떨어뜨리는 ping-pong 가능성
- [ ] `--add-dir` 같은 codex 멀티 디렉토리 옵션과 purplemux 워크스페이스 multiple directories 매핑 (Phase 2)

### Phase 2 별도 spec 작성 필요
- jsonl transcript 파서 (Codex `RolloutItem` 태그 유니온 → `ITimelineEntry`) — 가장 큰 작업
- 풀 타임라인, session-meta-cache, session-history, stats 통합
- `attachWorkStateObserver` 정식 구독 (Step 5 TODO)
- `AgentPanel` 일반화 (ClaudeCodePanel/CodexPanel 코드 중복 제거)
- `ISessionListEntry` 일반화

## 작업 단계 요약 (재확인)

| Phase | 결과물 | 수동 검증 |
| --- | --- | --- |
| 1 | provider 코어 + hook 인프라 + status 보강. Codex가 터미널 모드로 정상 동작. | 시나리오 1-7 (codex.md "수동 검증 시나리오") |
| 1.5 | UI 1급 시민화. CodexPanel + 메뉴 + 단축키 + 세션 목록 + 권한 응답. | 시나리오 4(권한), 5(/clear), UI 흐름 |
| 2 | 깊은 통합 (jsonl 파서, 타임라인, stats, observer 정식). 별도 spec. | 별도 |
