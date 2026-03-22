# 화면 구성

## 상단 바 레이아웃

### 글로벌 상태 요약 배치

```
┌─ App Header ─────────────────────────────────────────────────────────┐
│  PT  Purple Terminal     ⟳ 3 실행 중 · ● 2 확인 필요      🔔  [로그아웃] │
└──────────────────────────────────────────────────────────────────────┘
                           ↑ 글로벌 상태 요약 (클릭 가능)
```

- 위치: 로고/타이틀 우측, 우측 버튼 좌측 — 중앙 영역
- `flex-1`로 가용 공간 활용, `justify-center` 또는 `justify-end`

### 상태별 표시

| 상태 | 표시 |
|---|---|
| busy만 | `⟳ 3 실행 중` |
| attention만 | `● 2 확인 필요` |
| 양쪽 모두 | `⟳ 3 실행 중 · ● 2 확인 필요` |
| 모두 idle | 표시 없음 (DOM 미렌더링) |

### 요약 텍스트 스타일

```
⟳ 3 실행 중 · ● 2 확인 필요
```

- 전체: `text-xs text-muted-foreground cursor-pointer hover:text-foreground`
- 숫자: `font-medium`
- 구분자 `·`: `mx-1.5 text-muted-foreground/50`
- spinner: `Loader2 w-3 h-3 animate-spin`
- dot: `w-1.5 h-1.5 rounded-full bg-ui-red`
- hover: 전체 영역 밑줄 또는 배경 미세 변경

## 세션 목록 드롭다운

### 드롭다운 레이아웃

```
┌─ 글로벌 상태 요약 ──────────────────┐
│  ⟳ 3 실행 중 · ● 2 확인 필요       │ ← 클릭
└─────────────────────────────────────┘
       │
       ▼
┌─ 세션 목록 ─────────────────────────┐
│                                     │
│  ● frontend                        │
│    my-project                       │
│                                     │
│  ● api-test                        │
│    api-server                       │
│                                     │
│  ⟳ migration                       │
│    api-server                       │
│                                     │
│  ⟳ docs-gen                        │
│    docs                             │
│                                     │
│  ⟳ refactor                        │
│    my-project                       │
│                                     │
└─────────────────────────────────────┘
```

- 컴포넌트: shadcn/ui `Popover`
- 최대 높이: `max-h-64 overflow-y-auto` (항목 많을 때 스크롤)
- 너비: `w-64`

### 항목 구성

```
┌─────────────────────────────────┐
│  ● frontend                    │
│    my-project                   │
└─────────────────────────────────┘
 ↑  ↑ 탭 이름 (text-sm)
 │    Workspace 이름 (text-xs text-muted-foreground)
 dot/spinner
```

| 요소 | 스타일 |
|---|---|
| 상태 아이콘 | spinner `w-3 h-3` 또는 dot `w-1.5 h-1.5` |
| 탭 이름 | `text-sm` |
| Workspace 이름 | `text-xs text-muted-foreground` |
| 항목 hover | `hover:bg-accent` |
| 항목 padding | `px-3 py-2` |

### 정렬

1. `needs-attention` 항목 먼저 (dot)
2. `busy` 항목 다음 (spinner)
3. 같은 상태 내에서는 Workspace별 그룹

### 빈 상태

- 모든 탭 idle → 요약 텍스트 자체가 없으므로 드롭다운 불가
- 드롭다운 열린 상태에서 모두 idle로 전환 → 드롭다운 자동 닫힘 + 요약 텍스트 제거

## 브라우저 탭 title

```
일반:       Purple Terminal
확인 필요:  (2) Purple Terminal
```

- `needs-attention` 카운트만 표시 (busy 미포함)
- 카운트 0이면 접두사 제거

## 다크 모드

| 요소 | Light | Dark |
|---|---|---|
| 요약 텍스트 | `text-muted-foreground` | 자동 전환 |
| 드롭다운 | shadcn/ui Popover 기본 | 자동 전환 |
| dot | `bg-ui-red` | oklch 자동 전환 |

## 모바일

### 축약 표시

```
┌─ 모바일 Header ──────────────────────┐
│  ☰   Purple Terminal    ⟳ ● 2   🔔  │
└──────────────────────────────────────┘
                           ↑
                      아이콘 + 숫자만
```

- 텍스트("실행 중", "확인 필요") 생략
- spinner 아이콘 + dot 뱃지 숫자만 표시
- 터치 시 동일 드롭다운 (Popover)
- busy만 있으면: `⟳` 만
- attention만 있으면: `● 2` 만
- 양쪽: `⟳ ● 2`
- 모두 idle: 표시 없음

## 반응형/접근성

- 요약 텍스트: `role="button"`, `aria-haspopup="true"`, `tabIndex={0}`
- 드롭다운: `role="listbox"`, `aria-label="Claude 세션 목록"`
- 항목: `role="option"`, Enter로 선택
- 키보드: ↑↓ 이동, Enter 선택, Esc 닫기
- 스크린 리더: "3개 실행 중, 2개 확인 필요"
