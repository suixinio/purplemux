# 화면 구성

> 본 feature는 status-manager 견고성 강화 + Store 일반화로, **새 UI는 추가하지 않는다**. 기존 UI에 미치는 영향만 정리.

## 1. Store 일반화로 영향받는 컴포넌트 (rename만, UX 변화 없음)

| 컴포넌트 | 기존 prop/field | 신규 |
| --- | --- | --- |
| `claude-code-panel.tsx` | `claudeProcess`, `claudeInstalled`, `claudeProcessCheckedAt` | `agentProcess`, `agentInstalled`, `agentProcessCheckedAt` |
| `mobile-claude-code-panel.tsx` | 동일 | 동일 |
| `mobile-surface-view.tsx` | 동일 | 동일 |
| `pane-container.tsx` | 동일 | 동일 |
| `use-tab-store.ts` | `setClaudeProcess`, `setClaudeInstalled` | `setAgentProcess`, `setAgentInstalled` |

`codex-panel.tsx` (Phase 2 신규)는 처음부터 일반화 필드 사용.

## 2. cliState 안정화 → UX 개선

| 시나리오 | 기존 동작 | 견고화 후 |
| --- | --- | --- |
| auto-resume 직후 1-2초 | busy ↔ inactive ping-pong (헤더 인디케이터 깜박임) | F1 grace 5초 → 안정 유지 |
| codex 일시 fork/exec | inactive 회귀 → WebInputBar 비활성 → 사용자 입력 거부 | F2 paneTitle 검사 → 유지 |
| `/quit` 정상 종료 | (Claude만) busy stuck 가능 | F1/F2 통과 안 함 → 정상 inactive 전환 |
| 긴 텍스트 + Enter 송신 | tmux atomic burst → codex가 paste 오인 → 줄바꿈 표시 | `sendKeysSeparated` 50ms 분리 → 정상 입력 |

## 3. 인디케이터 시각 변화 (간접)

cliState 안정화로 인해 다음이 부드러워짐:

- 패널 헤더 spinner — busy/idle 빠른 깜박임 사라짐
- ContextRing — 회전 자연스러움 (사이클 사이에 reset 안 됨)
- 페인 타이틀 — `[ * ] Working...` ↔ shell 형식 빠른 전환 사라짐

## 4. 빈 / 로딩 / 에러 상태 (영향 없음)

본 feature는 기존 빈/로딩/에러 상태를 변경하지 않음. 단:

| 상태 | 견고화 후 보장 |
| --- | --- |
| Booting (`agentProcess: null`) | 5초 grace 동안 inactive 전환 차단 |
| Idle | F2 통과 시 1-2초 fork 윈도우에 유지 |
| Inactive (정상 종료) | F1/F2 통과 안 함 → 정상 전환 |

## 5. 접근성

- 인디케이터 깜박임 감소 → `prefers-reduced-motion` 사용자에게 부담 ↓
- 스크린리더 `aria-live` 영역의 cliState 변경 알림이 빈번하지 않음

## 6. 회귀 검증 시각 항목

수동 검증 시 시각으로 확인 가능한 영역:

- 패널 헤더: cliState 인디케이터 안정성 (5초 동안 변경 없는지)
- 페인 타이틀: tmux 자동 갱신과 cliState 동기화
- WebInputBar: 활성/비활성 전환 빈도
