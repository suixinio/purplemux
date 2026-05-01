---
page: codex-tui-ready-detection
title: Codex TUI Ready 감지 + Synthetic SessionStart
route: (서버 내부 — status-manager 폴링 사이클)
status: DRAFT
complexity: Medium
depends_on:
  - docs/STATUS.md
  - docs/TMUX.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex TUI Ready 감지 + Synthetic SessionStart

## 개요

Codex SessionStart hook은 **사용자 첫 메시지 후**에야 발사된다(`codex-rs/.../turn.rs:299`). 그 전엔 cliState='inactive' → WebInputBar 비활성 → 첫 메시지 못 보냄 → dead state. 3-layer 신호 검사로 codex가 입력 받을 준비됐다고 확신될 때 synthetic SessionStart를 발사해 ready 상태로 진입시킨다.

## 주요 기능

### 1. 3-layer 감지 (모두 만족 시 synthetic 발사)

cliState='inactive'인 codex 탭에 대해서만 검사 (다른 상태는 분기 진입 안 함).

- **Layer 1 — 프로세스 검출**: `provider.isAgentRunning(panePid)` true (codex Rust 자식 검출, 기존 grandchild walk 재사용)
- **Layer 2 — pane title 형식**: pane title이 shell-style(`cmd|path`) 아님 → OSC 0 발사 = SessionConfigured 통과
- **Layer 3 — composer 박스 + 마커**: pane content에 `╭` AND `╰` (composer 박스 두 줄) AND (`›` U+203A OR `!`) (마커)
  - 박스 조건이 핵심: 단순 `›`/`!` substring 검색은 spaceship/oh-my-posh 일부 zsh 테마, codex 시작 직전 zsh prompt 잔상, splash/changelog의 `!` 등으로 false positive 가능
  - 박스 문자(`╭`, `╰`)는 일반 shell prompt에서 거의 안 쓰고 codex composer는 두 줄 박스 UI 사용 → 정확도 ↑
  - 비용 추가 없음 (이미 캡처한 content 재사용)

### 2. Synthetic SessionStart 발사

3-layer 모두 통과 + cliState='inactive'면 `updateTabFromHook(session, 'session-start')` 합성 호출.

- 한 번 'idle'로 가면 분기 안 들어감 → idempotent 체크 불필요
- 페인 콘텐츠 캡처 비용은 cliState='inactive'일 때만 발생 → 무시 가능 (활성 codex 탭 평균 1-2회/사이클)

### 3. 폴링 비용 가드

- `capturePaneAtWidth`(수십 ms)는 cliState='inactive' + Layer 1+2 통과 후만 호출
- Layer 1 빠르게 false면 Layer 2/3 skip — 미실행 codex 탭에 영향 없음

### 4. UX 완성도 — 로딩 indicator

TUI ready 감지에서 1-2초 대기는 사용자에게 "버튼 비활성" 형태로 보임.

- CodexPanel session 체크 화면에 명시적 로딩 indicator (skeleton + "Codex 시작 중..." 메시지)
- 실패 시 Layer 1 false 5초 이상 지속하면 "Codex 시작에 실패했습니다" + Restart 버튼 노출 (Phase 2 패널 작업과 통합)

### 5. 회귀 검증 (수동)

- 시나리오: 빈 탭에서 `codex` 입력 → Layer 1/2/3 통과 시점 측정 → cliState 'inactive' → 'idle' 전환 확인
- false positive 회귀: zsh prompt만 떠있는 상태에서 cliState 변하지 않는지 (oh-my-zsh + p10k 환경)
- /clear 직후 Layer 3 다시 통과해도 idempotent (이미 'idle'이라 분기 안 들어감)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
