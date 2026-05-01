# 화면 구성

## 1. CodexPanel 레이아웃 (Desktop)

```
┌──────────────────────────────────────────────────────────┐
│  [OpenAIIcon] Codex          [● idle]    [Cmd+K]  [⋮]   │  ← 헤더
├──────────────────────────────────────────────────────────┤
│                                                          │
│   (Phase 2: placeholder)                                 │
│   "타임라인 통합 준비 중"                                │
│                                                          │
│   (Phase 3: TimelineView 정식 마운트)                    │
│   ┌────────────────────────────────────┐                 │
│   │ user-message                       │                 │
│   │ assistant-message                  │                 │
│   │ tool-call ...                      │                 │
│   └────────────────────────────────────┘                 │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  ContextRing 0%                                          │
├──────────────────────────────────────────────────────────┤
│  [WebInputBar — 메시지 입력]                       [↑]   │  ← 하단
└──────────────────────────────────────────────────────────┘
```

`ClaudeCodePanel`과 동일 레이아웃 — provider 분기로 색상/아이콘만 차이.

## 2. 헤더 구성

| 영역 | 컴포넌트 | 비고 |
| --- | --- | --- |
| 좌측 아이콘 | `OpenAIIcon` (`size-5`) | provider 식별 (`aria-label="Codex"`) |
| Provider 라벨 | "Codex" | `text-sm font-medium` |
| 모델명 (Phase 4) | `gpt-5-codex` 등 | `text-xs text-muted-foreground` |
| 상태 인디케이터 | 원형 dot | busy: 노란 + spin / idle: 초록 / needs-input: 파란 + 깜박임 |
| Quick action | `Cmd+K` (검색) | 기존 패턴 재사용 |
| 메뉴 | `⋮` dropdown | "세션 정보 / Restart / Quit" |

## 3. 빈 상태 (cliState='inactive')

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   [OpenAIIcon · 회색]                                    │
│                                                          │
│   Codex 세션이 시작되지 않았습니다                       │
│                                                          │
│   [Start Codex]                                          │
│                                                          │
│   ─────────────────────────────────────                  │
│   마지막 사용 세션:                                      │
│   "Add user authentication"                              │
│   3시간 전 · /Users/.../my-project                       │
│   [이어서 시작]                                          │
└──────────────────────────────────────────────────────────┘
```

| 영역 | 표시 조건 |
| --- | --- |
| 메인 메시지 | 항상 |
| Start Codex 버튼 | 항상 (실제로는 `codex` 명령 send-keys) |
| 마지막 사용 세션 미리보기 | 같은 워크스페이스에 codex 세션 1개 이상 |
| 이어서 시작 버튼 | 미리보기와 함께 — `codex resume <id>` |

## 4. 빈 상태 (`agentInstalled: false`)

`codex-preflight-and-errors` feature 정의 — Install 가이드 링크 + 안내.

## 5. Boot indicator (cliState='inactive', Layer 1+ 통과 중)

`codex-tui-ready-detection` feature 정의 — skeleton + "Codex 시작 중...".

## 6. 권한 요청 visual cue (cliState='needs-input')

```
┌──────────────────────────────────────────────────────────┐
│  [OpenAIIcon] Codex     [● needs-input · 파란 깜박임]   │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │  [AlertCircle · 파란]  권한 요청                 │   │
│  │  "rm -rf node_modules" 실행을 허용할까요?        │   │
│  │                                                  │   │
│  │  [Yes (y)]  [No (n)]                             │   │
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
```

자세히는 `codex-permission-prompt` feature 참조.

## 7. MobileCodexPanel

Desktop과 동일 컴포넌트 재사용 — 반응형 분기:

| 영역 | 모바일 차이 |
| --- | --- |
| 헤더 | 모델명 hidden, `⋮` 메뉴만 |
| Timeline | 동일 (가상 스크롤) |
| ContextRing | footer로 이동 |
| WebInputBar | bottom fixed |
| 빈 상태 버튼 | `min-h-12` 터치 타겟 |

## 8. Pane-new-tab-menu 항목

```
┌─────────────────────────────┐
│ 새 탭                       │
├─────────────────────────────┤
│ [+] Terminal                │
│ [+] Web Browser             │
│ [ClaudeIcon] Claude 새 대화 │
│ [OpenAIIcon] Codex 새 대화  │  ← 신규
│ [ListIcon] Codex 세션 목록  │  ← 신규
└─────────────────────────────┘
```

| 항목 | 비고 |
| --- | --- |
| Codex 새 대화 | `Cmd+Shift+X` shortcut 표시 우측 |
| Codex 세션 목록 | 별도 sheet 열기 (`codex-session-list` feature) |

미설치 시 disabled (`codex-preflight-and-errors`).

## 9. Agent 전환 잠금 토스트

```
┌──────────────────────────────────────────────┐
│ [⚠ XCircle]                                  │
│ Claude이 실행 중입니다. 터미널에서 /quit     │
│ 또는 Ctrl+D로 종료 후 다시 시도하세요        │
└──────────────────────────────────────────────┘
```

| 속성 | 값 |
| --- | --- |
| key | `switchAgentBlocked` |
| 아이콘 | `XCircle` |
| 자동 닫힘 | 5초 |
| 액션 | (없음 — 사용자가 직접 종료해야 함) |

## 10. 단축키 cheatsheet (`Cmd+/` 등)

| 단축키 | 동작 |
| --- | --- |
| `Cmd+Shift+T` | Terminal로 전환 |
| `Cmd+Shift+C` | Claude로 전환 |
| `Cmd+Shift+X` | Codex로 전환 (신규) |

## 11. 빈 / 로딩 / 에러 상태 정리

| 상태 | 표시 |
| --- | --- |
| `agentInstalled: null` | skeleton + "Codex 환경 확인 중..." |
| `agentInstalled: false` | Install 가이드 빈 상태 |
| `cliState='inactive'` (정상) | Start 버튼 + 마지막 세션 미리보기 |
| `cliState='inactive'` + Layer 통과 중 | Boot indicator (`codex-tui-ready-detection`) |
| `cliState='inactive'` + Layer 5초+ 실패 | 에러 상태 + Restart 버튼 |
| `cliState='busy'` | 정상 + spinner |
| `cliState='idle'` | 정상 + WebInputBar 활성 |
| `cliState='needs-input'` | 권한 요청 panel (`codex-permission-prompt`) |
| `cliState='ready-for-review'` | "리뷰 준비됨" 배지 |

## 12. 인터랙션 피드백

| 액션 | 피드백 |
| --- | --- |
| 헤더 상태 dot 변경 | 200ms transition (color + glow) |
| 빈 상태 Start 버튼 hover | 배경 강조 + 아이콘 scale |
| Start 버튼 클릭 | 즉시 boot indicator로 전환 |
| 메뉴 항목 hover | tooltip + 배경 강조 |
| 단축키 시각 안내 | 헤더 ⋮ 메뉴 우측에 회색 표시 |
| 잠금 토스트 | 5초 후 자동 dismiss + dismiss 버튼 |

## 13. 전환 애니메이션

- 패널 마운트: 200ms ease-out fade-in
- panelType 전환: 150ms cross-fade (lazy import 직후)
- 상태 인디케이터 색상: 200ms ease-out
- 빈 상태 → boot indicator: 300ms slide-fade

## 14. 반응형 / 접근성

- 모든 인디케이터 `aria-label` 동반 (색상만으로 의미 전달 X)
- 헤더 영역 `tabindex` 자연스러운 흐름 (좌→우)
- 빈 상태 메인 메시지 `role="status"`
- `prefers-reduced-motion` 환경: spinner 정적, 전환 즉시
- 모바일: 모든 버튼 `min-h-11` (44px 터치 타겟)

## 15. STYLE.md 팔레트 준수

- 헤더 배경: `bg-card` (light/dark mode 자동)
- 인디케이터 색상: `STYLE.md` muted palette (busy=amber-500, idle=emerald-500, needs-input=blue-500)
- Codex 차트 등에서 청록계 (Claude 보라계와 구분)
