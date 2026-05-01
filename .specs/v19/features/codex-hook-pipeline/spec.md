---
page: codex-hook-pipeline
title: Codex Hook 등록 및 페이로드 어댑터
route: (서버 내부 + POST /api/status/hook)
status: DRAFT
complexity: High
depends_on:
  - docs/STATUS.md
  - docs/TMUX.md
  - docs/DATA-DIR.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex Hook 등록 및 페이로드 어댑터

## 개요

Codex CLI의 hook 시스템을 활용해 SessionStart/UserPromptSubmit/Stop/PermissionRequest 4개 이벤트를 purplemux 서버로 흘려보낸다. 사용자 `~/.codex/config.toml`을 건드리지 않고 launch 시점에 inline TOML(`-c hooks.<E>=[...]`)로 우리 entry를 머지 주입한다.

## 주요 기능

### 1. `~/.purplemux/codex-hook.sh` 부트 시 작성

- 서버 부트 시 mode 0700으로 작성 (Claude hook script와 동일 컨벤션)
- 단일 스크립트로 4개 이벤트 모두 처리
- 동작: `tmux display-message`로 tmux session 추출 → query param으로 inject → payload는 codex stdin 그대로 forward → `POST /api/status/hook?provider=codex&tmuxSession=...`
- 인증 헤더 `x-pmux-token` (Claude와 통일)
- 외부 의존(jq 등) 회피 — `tmux display-message` 1회 + `curl POST` 단순 wrapper

### 2. Codex 인자 빌더에 hook 등록

`-c hooks.<Event>=[{matcher=".*", hooks=[{type="command", command="~/.purplemux/codex-hook.sh"}]}]` 형태로 4개 이벤트 등록.

- 등록 이벤트: `SessionStart`, `UserPromptSubmit`, `Stop`, `PermissionRequest`
- PreToolUse/PostToolUse는 v19 외부(예정 작업)
- TOML 직렬화: SDK의 `toTomlValue` 패턴 + shellQuote 단일따옴표 wrap

### 3. 사용자 config.toml 머지

- `[...ourEntries, ...userEntries]` 순서 (display_order 메타로 deterministic 출력 보존)
- 실행 모델 (검증 결과): codex 소스(`codex-rs/hooks/src/engine/dispatcher.rs:88-101`)는 `futures::future::join_all` + `.await` → 모든 handler 병렬 실행, codex 본체는 모두 끝날 때까지 await (`HookExecutionMode::Sync`)
- "안전성"의 정확한 근거: 각 hook은 별 프로세스 + stdin 격리 → 사용자 hook이 stdin 소비/실패해도 우리 hook에 영향 없음
- caveat: 사용자 hook이 timeout 안에서도 느리면 codex 본체 진행 지연 (우리 책임 밖)
- 사용자 config 파싱 실패 시 graceful fallback (우리 entry만 적용)
- 머지 시 `logger.info('codex hooks merged: N user entries')` 디버깅 보조

### 4. `/api/status/hook` provider 분기 (HTTP backward compat)

기존 Claude hook script(`hook-settings.ts:37`)는 `?provider=` query 없이 호출. endpoint는 default 분기로 호환 유지.

```ts
// pages/api/status/hook.ts
const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json(...);
  if (!verifyCliToken(req)) return res.status(403).json(...);
  const provider = (req.query.provider as string) || 'claude';
  if (provider === 'codex') return handleCodexHook(req, res);
  return handleClaudeHook(req, res);
};
```

- Claude script 변경 0 (provider 없음 → 자동 default)
- 두 payload 형식 차이(Claude `{event, session}` lowercase vs Codex `{session_id, hook_event_name}` snake/PascalCase)가 핸들러 함수 분리 트리거

### 5. Codex payload → 메타 갱신 + 동시성 보정

Codex SessionStart payload의 `source: "startup" | "resume" | "clear"` 필드(`codex-rs/hooks/src/schema.rs:338-349`) 활용한 분기.

```ts
entry.agentProviderId = 'codex';
entry.agentSessionId = payload.session_id;
if (payload.transcript_path) entry.jsonlPath = payload.transcript_path;
if (payload.hook_event_name === 'UserPromptSubmit' && payload.prompt) {
  entry.lastUserMessage = payload.prompt;
  entry.agentSummary = payload.prompt.slice(0, 80);
}

if (eventName === 'session-start') {
  const source = payload.source as 'startup' | 'resume' | 'clear';
  if (source === 'clear') {
    // /clear는 사용자 명시 액션 — race 없음. 메타 reset 후 강제 idle
    entry.agentSummary = null;
    entry.lastUserMessage = null;
    entry.lastAssistantMessage = null;
    statusManager.updateTabFromHook(tmuxSession, 'session-start');
  } else {
    // startup/resume: codex SessionStart는 첫 사용자 메시지 후 발사 (turn.rs:299)
    // → UserPromptSubmit과 race 가능. busy↔idle 회귀 방지 위해 보수적 분기
    if (entry.cliState === 'inactive' || entry.cliState === 'unknown') {
      statusManager.updateTabFromHook(tmuxSession, 'session-start');
    }
  }
} else if (eventName) {
  statusManager.updateTabFromHook(tmuxSession, eventName);
}
```

### 6. Codex provider `watchSessions` — 디렉토리 fs.watch 회피

- Claude는 `~/.claude/projects/<proj>/` fs.watch로 새 파일 감지 → /clear 자동 발동
- Codex는 `~/.codex/sessions/YYYY/MM/DD/` 일자 파티셔닝이라 fs.watch 비용 큼 + 자정 디렉토리 race 위험
- **대신 hook 채널 사용**: `globalThis.__ptCodexHookEvents` (EventEmitter) 신설. status-manager hook 핸들러가 emit, codex provider `watchSessions`가 listen → callback 호출 (CLAUDE.md rule 18 globalThis namespace 컨벤션 준수)
- transcript_path를 hook payload에서 직접 받으므로 fs.watch보다 정확/빠름
- jsonlPath 변경 시 timeline-server에 알림 → 기존 메커니즘(`timeline-server.ts:791-825`)이 unsubscribe → 새 파일 subscribe → 클라이언트 `timeline:session-changed` 발사 → sessionStats 자연 reset (ContextRing 0%로)

### 7. 보안

- `~/.purplemux/codex-hook.sh` mode 0700
- `~/.purplemux/cli-token` mode 0600 (`fs.writeFileSync` `mode: 0o600`)
- `/api/status/hook`은 256-bit hex 토큰 + `timingSafeEqual` + IP 필터(`isRequestAllowed`) 다층 보호
- 바인드 호스트는 `networkAccess` 설정 따라 `127.0.0.1` 또는 `0.0.0.0` (기본 `'all'`이라 외부 인터페이스 열려 있으나 토큰 없으면 403)
- codex-hook.sh는 `http://localhost:${PORT}` 호출 → bind 무관 loopback 도달

### 8. 에러 표면화

- hook script 작성/권한 실패: `logger.error` + 서버 부트 시 1회 토스트 ("Codex hook 설치 실패. codex 상태가 정확하지 않을 수 있습니다.")
- 사용자 config.toml 파싱 실패: `logger.warn` + 첫 codex 탭 생성 시 1회 토스트 ("config.toml 파싱 실패, purplemux hook만 적용됨"). session storage로 dedupe

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
