# 화면 구성

## 1. 노출 지점 — Codex 패널 부팅 단계

| cliState | 표시 |
| --- | --- |
| `inactive` (Layer 1 false) | 빈 상태 + Start 버튼 (`codex-panel-ui` 정의) |
| `inactive` (Layer 1 통과 + Layer 2/3 미통과) | **로딩 상태** — skeleton + "Codex 시작 중..." (본 feature 명세) |
| `inactive` (5초 이상 Layer 2/3 false) | **에러 상태** — "Codex 시작에 실패했습니다" + Restart 버튼 |
| `idle` | 정상 패널 |

## 2. 로딩 indicator 구성

### 컴포넌트 위치

`codex-panel-ui`의 launching 단계에서 마운트 — 본 feature가 정의한 `<CodexBootProgress />` 활용.

### 레이아웃

```
┌─────────────────────────────────────────┐
│  [OpenAIIcon · spin]                    │
│                                         │
│  Codex 시작 중...                       │
│  잠시만 기다려 주세요                   │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━ (skeleton bar) │
└─────────────────────────────────────────┘
```

### 시각 구성

| 요소 | 컴포넌트 | 비고 |
| --- | --- | --- |
| 아이콘 | `OpenAIIcon` + `animate-spin` | 1.5s linear infinite |
| 메인 메시지 | `text-base font-medium` | "Codex 시작 중..." |
| 보조 메시지 | `text-sm text-muted-foreground` | "잠시만 기다려 주세요" |
| Skeleton bar | shadcn `Skeleton` | 3줄 (메시지 입력 영역 placeholder) |

### 단계별 메시지 (옵션)

Layer 통과 진행 표시:

| Layer 통과 | 메시지 |
| --- | --- |
| Layer 1만 | "Codex 시작 중..." |
| Layer 1+2 | "거의 다 됐어요..." |
| Layer 1+2+3 | (즉시 idle 전환 — 표시 안 함) |

## 3. 에러 상태 (5초 이상 Layer 2/3 false)

```
┌─────────────────────────────────────────┐
│  [AlertCircle · 빨간색]                 │
│                                         │
│  Codex 시작에 실패했습니다              │
│  터미널에서 직접 확인해 보세요          │
│                                         │
│  [Restart] [터미널 보기]                │
└─────────────────────────────────────────┘
```

| 액션 | 동작 |
| --- | --- |
| Restart | 새 codex 명령 send-keys (현 탭 유지) |
| 터미널 보기 | panelType을 일시적으로 `terminal`로 전환 (잠금 비적용 — 같은 탭 내 codex 그대로) |

## 4. 인터랙션 피드백

| 액션 | 피드백 |
| --- | --- |
| 탭 진입 + 이미 booting 중 | 즉시 boot indicator 표시 (state 동기화) |
| Layer 3 통과 | indicator → 패널 정상 마운트 (200ms fade-out) |
| Restart 버튼 | spinner 즉시 표시 + send-keys 호출 |

## 5. 반응형 / 접근성

- 모바일: skeleton bar는 너비 100% — 동일 컴포넌트 재사용
- `aria-busy="true"` (loading 영역) — 스크린리더 통지
- 메인 메시지는 `aria-live="polite"` — 단계 변경 시 자동 안내
- spinner는 `prefers-reduced-motion` 감지 시 정적 아이콘으로 대체

## 6. 색상 / 테마

- `STYLE.md` muted palette 준수
- spinner color: `text-foreground` (light/dark mode 자동)
- 에러 색상: `text-destructive` (shadcn token)
