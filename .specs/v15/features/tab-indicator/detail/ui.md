# 화면 구성

## 탭 바 레이아웃

### 인디케이터 배치

```
┌─ Pane Tab Bar ───────────────────────────────────────────┐
│  [⟳ api-server] [● frontend]  [docs]        [+]         │
└──────────────────────────────────────────────────────────┘

⟳ = spinner (busy)
● = dot (needs-attention)
  = 표시 없음 (idle)
```

- 인디케이터 위치: 탭 이름 좌측
- 탭 이름과 인디케이터 간격: `gap-1.5`
- 인디케이터 영역: `flex-shrink-0` (탭 이름이 길어도 잘리지 않음)

### 활성 탭

```
┌─ Pane Tab Bar ───────────────────────────────────────────┐
│  [⟳ api-server]  [frontend]  [docs]          [+]        │
└──────────────────────────────────────────────────────────┘
     ↑ 활성 탭                ↑ idle 탭
     busy spinner 표시        needs-attention이라도
                              활성 탭이면 dot 숨김
```

## 인디케이터 스타일

### Spinner (busy)

```
⟳
```

- 아이콘: `lucide-react` `Loader2`
- 크기: `w-3 h-3` (12px)
- 색상: `text-muted-foreground`
- 애니메이션: `animate-spin`
- 활성 탭에도 표시

### Dot (needs-attention)

```
●
```

- 구현: `<span>` 원형 div
- 크기: `w-1.5 h-1.5` (6px)
- 색상: `bg-ui-red`
- 모서리: `rounded-full`
- 활성 탭에서는 숨김
- 애니메이션 없음 (정적 표시)

### Idle

- DOM 요소 없음 — 인디케이터 영역 자체 미렌더링
- 탭 이름만 표시

## 일반 터미널 탭

```
┌─ Pane Tab Bar ───────────────────────────────────────────┐
│  [⟳ api-server]  [terminal]  [docs]          [+]        │
└──────────────────────────────────────────────────────────┘
                     ↑ panelType !== 'claude-code'
                     인디케이터 표시 안 함
```

- `panelType === 'claude-code'`인 탭에서만 인디케이터 표시
- 일반 터미널 탭에서는 상태 저장소 구독도 하지 않음

## 다크 모드

| 요소 | Light | Dark |
|---|---|---|
| spinner | `text-muted-foreground` | 자동 전환 |
| dot | `bg-ui-red` (oklch 0.592 0.101 20.5) | `bg-ui-red` (oklch 0.703 0.085 19.4) |

## 모바일

### Surface 선택 트리

```
┌─ 모바일 Workspace 메뉴 ──────────┐
│  📁 my-project                    │
│  ├── Pane 1                       │
│  │   ├── ⟳ api-server            │  ← spinner
│  │   └── ● frontend              │  ← dot
│  └── Pane 2                       │
│      └── docs                     │
└───────────────────────────────────┘
```

- 데스크톱과 동일한 spinner/dot 스타일
- 터치 탭 시 dismiss 처리 동일

## 반응형/접근성

- 인디케이터는 순수 시각 요소 — `aria-hidden="true"`
- 스크린 리더용: 탭에 `aria-label` 추가 (예: "api-server, 처리 중" 또는 "frontend, 확인 필요")
- 키보드: 기존 탭 네비게이션에 영향 없음
