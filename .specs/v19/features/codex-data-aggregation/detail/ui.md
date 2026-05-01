# 화면 구성

## 1. Stats 페이지 — 통합 차트 + Codex 전용 섹션

### 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│  Stats — 최근 30일                                       │
├──────────────────────────────────────────────────────────┤
│  ┌── 총 사용량 ──────────────────────────────────────┐  │
│  │                                                    │  │
│  │   [영역 차트]  [범례: ● Claude 보라 / ● Codex 청록]│  │
│  │                                                    │  │
│  │  Day 1 ▮▮▮ ▮▮     Day 2 ▮▮▮▮ ▮     ...           │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  Provider별 합계                                         │
│  ┌────────────────────┐  ┌─────────────────────┐        │
│  │ [ClaudeIcon] Claude│  │ [OpenAIIcon] Codex  │        │
│  │  124.5k tokens     │  │  87.2k tokens       │        │
│  │  47 sessions       │  │  23 sessions        │        │
│  └────────────────────┘  └─────────────────────┘        │
├──────────────────────────────────────────────────────────┤
│  Codex 전용 — Rate Limits                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Primary: 32% used                                 │  │
│  │  Context window: 200k                              │  │
│  │  Cached input: 12.4k tokens                        │  │
│  │  Reasoning output: 8.7k tokens                     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 차트 컬럼

| 컬럼 | 데이터 | 비고 |
| --- | --- | --- |
| Day (X축) | 최근 30일 | 일별 stack |
| Tokens (Y축) | input + output 합계 | provider 분리 stack |
| Provider 분리 | Claude 보라 / Codex 청록 | STYLE.md 팔레트 |

### Provider별 합계 카드

| 영역 | 표시 |
| --- | --- |
| 아이콘 | `ClaudeIcon` / `OpenAIIcon` |
| 라벨 | "Claude" / "Codex" |
| 토큰 합계 | `{N}k tokens` (천 단위) |
| 세션 수 | `{N} sessions` |
| 한 provider 미사용 | 회색 처리 + "사용 내역 없음" |

### Codex 전용 섹션 (rate_limits)

| 필드 | 표시 |
| --- | --- |
| `rate_limits.primary.used_percent` | "32% used" + 게이지 바 |
| `model_context_window` | "200k" |
| `cached_input_tokens` | "12.4k tokens" |
| `reasoning_output_tokens` | "8.7k tokens" |

Claude는 해당 섹션 hidden (조건부 렌더).

## 2. Notification Sheet — provider 시각 구분

### 그룹 헤더

```
┌─────────────────────────────────────────────┐
│  세션: Add user authentication              │
│  [OpenAIIcon] Codex · 3시간 전 · 12.4k tokens│
├─────────────────────────────────────────────┤
│  알림 항목 1                                │
│  알림 항목 2                                │
│  ...                                        │
└─────────────────────────────────────────────┘
```

| 영역 | 표시 |
| --- | --- |
| 세션 제목 | first user message slice |
| Provider 아이콘 | `ClaudeIcon` / `OpenAIIcon` (`size-4`) |
| Provider 라벨 | "Claude" 또는 "Codex" |
| 시각 | relative |
| 토큰 합계 | 단순 total (provider별 세부는 stats 페이지에서) |

### 알림 항목 (기존 구조 유지)

- title, body, timestamp
- 클릭 시 해당 세션 timeline 열기 (provider 자동 분기)

## 3. ContextRing — Codex 통합

기존 `ContextRing` 컴포넌트가 패널 footer에 표시.

| Provider | 토큰 source | 표시 |
| --- | --- | --- |
| Claude | 라인별 누적 합산 | `{used}/{model_max}` |
| Codex | `event_msg.token_count.info.total_token_usage` | 동일 형식 + `reasoning_output_tokens` 별도 표시 (옵션) |

```
┌──────────────────────┐
│  ◐ 32%  64k / 200k   │   ← ContextRing
└──────────────────────┘
```

## 4. 차트 컴포넌트 — `recharts` 기반 (또는 동등)

```tsx
<AreaChart data={dailyStats}>
  <Area dataKey="claudeTokens" stackId="provider" fill="#a78bfa" />  {/* 보라 */}
  <Area dataKey="codexTokens" stackId="provider" fill="#5eead4" />   {/* 청록 */}
  <XAxis dataKey="day" />
  <YAxis />
  <Tooltip content={<CustomTooltip />} />
</AreaChart>
```

### Tooltip

```
┌────────────────────────┐
│  Day 15                │
│  Claude:  4.2k tokens  │
│  Codex:   1.8k tokens  │
│  Total:   6.0k tokens  │
└────────────────────────┘
```

## 5. 빈 / 로딩 / 에러 상태

| 영역 | 빈 | 로딩 | 에러 |
| --- | --- | --- | --- |
| Stats 차트 | "이 기간에 세션이 없습니다" + Period selector | skeleton chart | "Stats 로드 실패" + Retry |
| Provider 합계 카드 | "사용 내역 없음" (해당 provider만 회색) | skeleton card | 동일 |
| Rate Limits | Codex 미사용 시 hidden | skeleton | hidden |
| Notification sheet | "알림이 없습니다" | skeleton 3개 | "로드 실패" + Retry |
| ContextRing | "—" + 회색 | skeleton (작은 원) | 표시 안 함 |

## 6. Graceful degradation

한 provider 실패해도 다른 provider 데이터는 표시:

| 상황 | 표시 |
| --- | --- |
| Claude 파서 실패 | Claude 합계 "에러", Codex 정상 |
| Codex 디렉토리 read 실패 | Codex 합계 "에러", Claude 정상 |
| 두 provider 모두 실패 | "Stats 로드 실패" 전체 에러 |

## 7. 인터랙션 피드백

| 액션 | 피드백 |
| --- | --- |
| 차트 hover | tooltip + provider 분리 표시 |
| Provider 카드 클릭 | 해당 provider만 필터 (옵션 — v19 외부) |
| Notification 항목 클릭 | 해당 session timeline 열기 |
| Period selector 변경 | skeleton + 새 데이터 fetch |
| Rate Limits 게이지 hover | 정확한 percent + 한도 표시 |

## 8. 전환 애니메이션

- 차트 데이터 변경: smooth transition (300ms)
- 게이지 바 채워짐: ease-out (500ms)
- Skeleton → 실제 데이터: fade transition (200ms)

## 9. 접근성

- 차트 `aria-label` 결합 (예: "Daily token usage chart, Claude and Codex stacked")
- Provider 카드는 button으로 (필터 적용 — 옵션)
- 게이지 바 `role="progressbar"` + `aria-valuenow`
- 색상 외에 패턴/라벨 병기 (색맹 사용자)

## 10. 모바일

| 영역 | 모바일 차이 |
| --- | --- |
| 차트 | 가로 스크롤 가능 |
| Provider 카드 | 1열 stack |
| Rate Limits | 항목별 stack |
| Notification sheet | bottom sheet (기존 패턴) |
| ContextRing | footer 컴팩트 |

## 11. STYLE.md 팔레트

- Claude 색: 보라계 (`violet-400` / `purple-400`)
- Codex 색: 청록계 (`teal-400` / `emerald-400`)
- 게이지 색: severity (낮음=초록, 중간=노랑, 높음=빨강)
- 카드 배경: `bg-card`
- 메타 텍스트: `text-muted-foreground`

## 12. Stats 페이지 진입점

| 경로 | 비고 |
| --- | --- |
| 사이드바 메뉴 "Stats" | 기존 |
| 패널 footer ContextRing 클릭 | 해당 세션의 stats |
| Notification sheet 헤더 토큰 클릭 | 해당 세션의 stats |
