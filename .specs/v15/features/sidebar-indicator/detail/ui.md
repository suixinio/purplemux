# 화면 구성

## 사이드바 레이아웃

### Workspace 항목 인디케이터 배치

```
┌─ Sidebar ──────────────────────┐
│                                │
│  📁 my-project         ⟳  2   │  ← spinner + 숫자 뱃지
│  📁 api-server            1   │  ← 숫자 뱃지만
│  📁 docs                  ⟳   │  ← spinner만
│  📁 personal                  │  ← idle (표시 없음)
│                                │
│  [+ 새 Workspace]             │
│                                │
│  ──────────────────────────── │
│  ⚙ 설정                       │
└────────────────────────────────┘
```

- Workspace 이름: 좌측 정렬
- 인디케이터 영역: 우측 정렬 (`ml-auto flex items-center gap-1.5`)
- spinner 위치: 뱃지 좌측
- 뱃지 위치: 우측 끝

## 인디케이터 스타일

### Spinner (busy 탭 존재)

- 아이콘: `lucide-react` `Loader2`
- 크기: `w-3.5 h-3.5` (14px)
- 색상: `text-muted-foreground`
- 애니메이션: `animate-spin`

### 숫자 뱃지 (needs-attention 탭 존재)

```
 2
```

- 배경: `bg-ui-red/20`
- 텍스트: `text-ui-red`
- 크기: `text-xs`, `min-w-4 h-4`
- 모서리: `rounded-full`
- 정렬: `flex items-center justify-center`
- 패딩: `px-1`
- 숫자: needs-attention 탭 수
- 9 초과: `9+` 표시

### 복합 상태 (busy + needs-attention 동시)

```
┌────────────────────────────────┐
│  📁 my-project         ⟳  2   │
└────────────────────────────────┘
                          ↑  ↑
                     spinner 뱃지
```

- 두 요소 모두 표시, `gap-1.5`로 간격
- spinner가 좌측, 뱃지가 우측

### Idle (모두 완료)

- 인디케이터 영역 비어 있음
- Workspace 이름만 표시

## 활성 Workspace 하이라이트

```
┌─ Sidebar ──────────────────────┐
│                                │
│ ▎📁 my-project         ⟳  2   │  ← 활성 + 인디케이터
│  📁 api-server            1   │
│  📁 docs                      │
│                                │
└────────────────────────────────┘
```

- 활성 Workspace에도 인디케이터 표시
- 기존 활성 하이라이트(좌측 바, 배경색)와 인디케이터는 독립

## 다크 모드

| 요소 | Light | Dark |
|---|---|---|
| spinner | `text-muted-foreground` | 자동 전환 |
| 뱃지 배경 | `bg-ui-red/20` | oklch 자동 전환 |
| 뱃지 텍스트 | `text-ui-red` | oklch 자동 전환 |

## 모바일

### 햄버거 메뉴 Workspace 목록

```
┌─────────────────────────────┐
│  ☰ Purple Terminal          │
├─────────────────────────────┤
│  📁 my-project      ⟳  2   │  ← 동일 인디케이터
│  📁 api-server         1   │
│  📁 docs               ⟳   │
│  📁 personal                │
├─────────────────────────────┤
│  [+ 새 Workspace]          │
│  ⚙ 설정                    │
└─────────────────────────────┘
```

- 데스크톱과 동일한 spinner/뱃지 스타일
- 터치 영역: Workspace 항목 전체 높이 (최소 44px)

## 반응형/접근성

- 뱃지: `aria-label="확인 필요 2개"` (스크린 리더용)
- spinner: `aria-label="처리 중"`, `role="status"`
- Workspace 클릭 영역에 인디케이터 포함 (클릭 가능)
