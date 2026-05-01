---
page: codex-panel-ui
title: Codex 패널 + 메뉴/단축키 + Agent 전환 잠금
route: (탭 콘텐츠 영역 + pane-new-tab-menu)
status: DETAILED
complexity: High
depends_on:
  - docs/STYLE.md
  - docs/STATUS.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex 패널 + 메뉴/단축키 + Agent 전환 잠금

## 개요

Codex를 UI 1급 시민으로 만든다. `CodexPanel`/`MobileCodexPanel`은 `ClaudeCodePanel` 거의 복사 + placeholder timeline(Phase 3에서 정식 마운트). Codex 메뉴 항목 추가, `Cmd+Shift+X` 단축키, 그리고 동일 탭 내 agent 전환 잠금 규칙을 함께 도입한다.

## 주요 기능

### 1. CodexPanel / MobileCodexPanel

- `ClaudeCodePanel` 레이아웃·상태 머신 거의 복사 + provider 분기
- Phase 2엔 timeline 영역에 placeholder ("타임라인 통합 준비 중") — Phase 3에서 정식 `TimelineView` 마운트
- 상태 인디케이터: Claude와 동일 원형 (`OpenAIIcon` 재사용)
- `agentInstalled: false`일 때 빈 상태 + Install 링크
- 모바일 패리티: Desktop과 동일 timeline 컴포넌트 재사용 → Phase 3에서 자동 풀 timeline 표시

### 2. pane-new-tab-menu 항목

- "Codex 새 대화" — 새 탭 생성 + panelType `codex-cli`로 launch
- "Codex 세션 목록" — Codex 세션 선택 sheet 열기 (별도 feature)
- 미설치 시 disabled + tooltip + 클릭 시 install 안내 토스트

### 3. 단축키 — `view.mode_codex` = `Cmd+Shift+X`

- `view.mode_claude` = `Cmd+Shift+C`
- `view.mode_terminal` = `Cmd+Shift+T`
- `view.mode_codex` = `Cmd+Shift+X` (codeX의 X)
- `use-keyboard-shortcuts.ts`에 `switchMode('codex-cli')` 분기 추가

### 4. Agent 전환 잠금 규칙

`use-keyboard-shortcuts.ts`의 `switchMode(target)`에 적용:

```ts
const switchMode = (target: TPanelType) => {
  const current = tab.panelType;
  const isAgentRunning = tab.cliState !== 'inactive' && tab.cliState !== 'unknown';
  const currentIsAgent = current === 'claude-code' || current === 'codex-cli';
  const targetIsAgent = target === 'claude-code' || target === 'codex-cli';

  if (isAgentRunning && currentIsAgent && targetIsAgent && target !== current) {
    toast.error(t('switchAgentBlocked', { name: currentName }));
    return;
  }
  updateTabPanelType(paneId, tabId, target);
};
```

**잠금 매트릭스**:

| 현재 | 대상 | cliState | 결과 |
| --- | --- | --- | --- |
| terminal/diff/web-browser | agent (claude/codex) | any | ✅ 자유 (display만 변경, CLI 안 죽임) |
| agent | terminal/diff/web-browser | any | ✅ 자유 |
| claude-code | codex-cli (또는 반대) | inactive/unknown | ✅ 자유 (실제 종료된 상태) |
| claude-code | codex-cli (또는 반대) | busy/idle/needs-input/ready-for-review | ❌ **차단 + 토스트** |
| 같은 panelType | 같은 panelType | any | no-op |

**잠금 풀림 조건**:
- 터미널에서 `/quit` (codex) 또는 `/exit` (claude) → process exit → status-resilience F2 통과 안 함 → cliState='inactive' → 자동 해제
- process 자연 종료 (panic 등) → 동일 경로

**적용 사이트 (3곳)**:
1. 단축키 `use-keyboard-shortcuts.ts`
2. Content header panel selector `content-header.tsx:75,95`
3. tab-bar `tab-bar.tsx:259`
- `pane-new-tab-menu`는 새 탭 생성이라 다른 탭의 agent 상태와 무관 → 잠금 비적용

**다른 탭 동시 실행**:
- 한 워크스페이스에 codex 탭 + claude 탭 동시 가능 (각 탭 독립)
- 잠금은 같은 탭의 panelType 전환에만 적용

### 5. 토스트 메시지 (옵션 B — 안내 강화)

- key: `switchAgentBlocked`
- 한국어: `"{currentName}이 실행 중입니다. 터미널에서 /quit 또는 Ctrl+D로 종료 후 다시 시도하세요"`
- 영문: `"{currentName} is running. Exit with /quit or Ctrl+D in the terminal first"`
- `{currentName}`: "Claude" 또는 "Codex" (`tab.panelType` → display name 매핑)

**옵션 비교 근거**:
- A (단순 메시지) — "어떻게 종료하지?" 의문 유발
- C (action button) — panelType 자동 변형으로 사용자 의도 왜곡
- B — 친절+명확+안전

### 6. UX 완성도

- 권한 요청 도착 시 즉각적인 visual cue (파란 띠/아이콘 깜박임). 현재 `[ ! ] Action Required` 페인 타이틀 외에 패널 자체에서도 강조
- 상태 전환 애니메이션 — Claude 패널과 동일 transition (200ms ease-out)
- 패널 헤더에 provider 식별: `OpenAIIcon` + "Codex" 라벨 + 모델명 (Phase 4 stats에서 추가 노출)
- 빈 상태 (cliState='inactive'): Start 버튼 + 마지막 사용 세션 미리보기 (있다면)

### 7. 성능

- prefetch: agent 전환 시 새 패널 모듈 lazy import 미리 로드 (이미 `claude-code-panel`이 lazy → 동일 패턴)
- 패널 마운트는 panelType별 분기 하나 추가 — 비용 0

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
| 2026-05-01 | 상세 문서 작성 (ui/flow/api) | DETAILED |
