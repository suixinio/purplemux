# 화면 구성

> 본 feature는 서버 내부 provider 슬롯 구현으로 직접 UI는 없다. 사용자에게 노출되는 부수 효과만 정리.

## 1. 노출 지점 — provider 식별이 보이는 영역

| 영역 | 표시 내용 | 컴포넌트 (예정 / 기존) |
| --- | --- | --- |
| 패널 헤더 | `OpenAIIcon` + "Codex" 라벨 | `codex-panel-ui` feature |
| 페인 타이틀 | tmux pane title `node\|/path` (codex shim) → CLI ready 후 OSC 0로 갱신 | tmux 자동 |
| layout.json 디스크 | `agentState.providerId: 'codex'` | 서버 자동 |
| 메뉴 항목 | "Codex 새 대화" / "Codex 세션 목록" | `pane-new-tab-menu` (`codex-panel-ui` feature) |
| Preflight 페이지 | Codex 섹션 (`installed`/`version`/`path`) | `codex-preflight-and-errors` feature |

## 2. 상태 인디케이터 동기화

`IAgentProvider` 추상 슬롯이 채워진 결과로 자동 동작:

- cliState `inactive` → `idle` 전환 시 패널 헤더 점등 (`OpenAIIcon` 컬러 + glow)
- 권한 요청 도착 시 `[ ! ] Action Required` 페인 타이틀 — Claude와 동일 메커니즘
- Sub-agent (claude의 sidechain)는 codex에 없음 → `agent-group` UI 자체가 표시 안 됨 (분기 영역)

## 3. agentState 관찰

설정 패널이나 디버그 뷰에서 `tab.agentState` 표시 시:

- `providerId: 'codex'`
- `sessionId: <uuid>` — `codex resume <uuid>` 인자로 그대로 사용 가능
- `jsonlPath` — 파일 시스템 경로 (디버그용 표시 또는 "파일 열기" 액션)
- `summary` — 첫 user message slice (80자) — 탭 이름 fallback

## 4. 빈/로딩/에러 상태 (provider 슬롯 관점)

| 상황 | 표시 |
| --- | --- |
| `agentInstalled: null` (preflight 미완료) | 패널 skeleton + "Codex 환경 확인 중..." |
| `agentInstalled: false` | 빈 상태 + Install 링크 (`codex-preflight-and-errors`에서 정의) |
| `agentProcess: false` (cliState='inactive') | Start 버튼 + 마지막 사용 세션 미리보기 (`codex-panel-ui`) |

## 5. 접근성 / 반응형

- provider 식별 아이콘은 `aria-label="Codex"` 필수 (스크린리더가 색상만으론 식별 불가)
- 모바일 패리티: 동일한 `agentState` 사용 → `MobileCodexPanel`에 별도 분기 없음
- Tab key 포커스 순서: 헤더 아이콘은 일반적으로 `tabindex="-1"` (장식) — 실제 액션 버튼만 포커스
