---
page: codex-provider-core
title: Codex Provider 코어 모듈
route: (서버 내부 — provider 슬롯)
status: DETAILED
complexity: High
depends_on:
  - docs/STATUS.md
  - docs/TMUX.md
  - docs/DATA-DIR.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex Provider 코어 모듈

## 개요

`IAgentProvider` 추상 위에 OpenAI Codex CLI를 두 번째 provider로 구현한다. v18까지 마련한 추상이 첫 사용자를 받는 단계로, Claude provider와 동일한 슬롯(7개 모듈)을 채워 신규 panelType `'codex-cli'`를 일급 시민으로 만든다.

### 현재 상태

`providers/claude/` 한 종류만 존재. 두 번째 provider가 없는 상태에서 `IAgentProvider` 인터페이스가 검증되지 않음.

### 목표 구조

```
src/providers/codex/
├── index.ts                 # IAgentProvider export
├── session-detection.ts     # codex 자식 프로세스 검출
├── preflight.ts             # 설치/버전 확인
├── client.ts                # launch / resume command builder
├── work-state-observer.ts   # hook payload → TAgentWorkStateEvent (Phase 1: helper만)
├── prompt.ts                # codex-prompt.md writer + inline TOML 주입
└── hook-config.ts           # 사용자 config.toml 머지 + -c hooks.<E>=[...]
```

## 주요 기능

### 1. providers/codex/ 7개 모듈 구현

`IAgentProvider` 인터페이스 슬롯 1:1 매핑.

- **`index.ts`** — `providerId: 'codex'`, `panelType: 'codex-cli'`, `displayName: 'Codex'`, `OpenAIIcon` 재사용
- **`session-detection.ts`** — 프로세스 트리 `shell → node (codex.js shim) → codex (Rust binary)` 2단계. 기존 grandchild walk 재사용. UUID 정규식은 Claude와 동일 (둘 다 v4 UUID)
- **`preflight.ts`** — `codex --version` 호출, 미설치 시 `installed: false` + path/version null. `IPreflightResult.codex` 필드에 채워짐
- **`client.ts`** — `codex` / `codex resume <id>` 인자 빌더. `-c developer_instructions=...` + `-c hooks.<E>=[...]` 머지 결과 inject
- **`work-state-observer.ts`** — Phase 1엔 `translateCodexHookEvent(payload): TAgentWorkStateEvent | null` helper만 export. `attachWorkStateObserver` 슬롯은 Phase 4에서 정식 구현
- **`prompt.ts`** — `writeCodexPromptFile(ws)` 구현. workspace 디렉토리에 `codex-prompt.md` 작성. Claude의 `writeWorkspacePrompt`와 동일 위치(`workspace-store.ts:330/375/404`, `server.ts:389`)에서 트리거
- **`hook-config.ts`** — `~/.codex/config.toml` 파싱 → `[...ourEntries, ...userEntries]` 머지. TOML 직렬화는 SDK의 `toTomlValue` 패턴 (JSON.stringify escape) + shellQuote 단일따옴표 wrap. `triple-quoted literal('''...''')` 사용. 파싱 실패 시 graceful (우리 entry만 적용)

### 2. matchesProcess 시그니처 확장

두 provider 모두 `node`가 직접 자식이라 args(`claude.js` vs `codex.js`)로 disambiguation 필요.

- `matchesProcess(cmd: string, args?: string[]): boolean` 시그니처 변경
- 호출 사이트(`auto-resume.ts:62` 등)에 args 전달
- Claude/Codex 양쪽 implementation에 args 분기 추가

### 3. ITab agentState 사용 패턴 (legacy 필드 없음)

Codex는 신규 provider라 디스크 호환 데이터가 없음 → ITab에 `codex*` legacy 필드 추가하지 않고 `IAgentState`(`types/terminal.ts:14-19`) 4개 필드(`providerId`/`sessionId`/`jsonlPath`/`summary`)만 사용.

- readField/writeField: `tab.agentState?.providerId === 'codex' ? tab.agentState[field] : null` (Claude는 `claude*` legacy fallback 있지만 Codex는 단순 분기)
- `lastUserMessage`는 ITab의 별도 필드(`terminal.ts:36`) 그대로 활용
- `lastResumeOrStartedAt` (status-resilience F1 fallback)은 status-manager 런타임 only — 디스크 저장 불필요
- Provider 전환 시 동작: 같은 탭에서 panelType `claude-code` ↔ `codex-cli` 전환은 agentState 덮어쓰기. Claude는 legacy fallback으로 자연 resume / Codex는 새 session 시작

### 4. layout.json 디스크 표현

```json
{
  "id": "tab-xxx",
  "sessionName": "tmux-xxx",
  "name": "Codex Session",
  "panelType": "codex-cli",
  "agentState": {
    "providerId": "codex",
    "sessionId": "01997fee-5078-7d32-aeb3-0b141d322a26",
    "jsonlPath": "/Users/.../rollout-2025-09-25T17-12-28-01997fee....jsonl",
    "summary": "Add user authentication"
  }
}
```

### 5. 시스템 프롬프트 inline 주입

사용자 `~/.codex/{config.toml, AGENTS.md, auth.json}` 일체 미변경 원칙 준수.

- `-c developer_instructions="$(cat <path>)"` inline TOML 주입 (append, 기본 시스템 프롬프트 보존)
- 워크스페이스에 `codex-prompt.md` 작성, 매 launch마다 재주입
- TOML triple-quoted literal 사용, prompt 내용 내 `'''` sanitize
- 인자 길이 ARG_MAX(256KB+) 한참 아래 (~3KB)
- **auto-managed file 주의**: 사용자 수동 편집 시 다음 launch에 buildBody가 덮어씀. `buildBody`는 현재 `ws.id`만 사용 → workspace metadata 변경해도 prompt 영향 거의 없음 (의도된 단순함)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
| 2026-05-01 | 상세 문서 작성 (ui/flow/api) | DETAILED |
