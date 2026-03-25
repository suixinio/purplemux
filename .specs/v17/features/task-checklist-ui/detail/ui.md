# 화면 구성

## 체크리스트 (타임라인 상단 sticky)

### 펼침 상태

```
┌─────────────────────────────────────────┐
│  ● 2 / 4                            ▼  │  ← 헤더
├─────────────────────────────────────────┤
│  ✅ checkJsonlIdle mtime 캐시 적용      │  ← completed
│  🔵 TextEncoder 재사용                  │  ← in_progress (펄스 닷)
│  ○  broadcast stringify 1회로 최적화    │  ← pending
│  ○  writeQueue shift() → 인덱스 기반    │  ← pending
└─────────────────────────────────────────┘
```

### 접힌 상태

```
┌─────────────────────────────────────────┐
│  ● 2 / 4  TextEncoder 재사용        ▶  │  ← 헤더 + 현재 진행 중 subject
└─────────────────────────────────────────┘
```

### 전부 완료 상태

```
┌─────────────────────────────────────────┐
│  ✅ 4 / 4                           ▼  │  ← 헤더 (text-positive)
├─────────────────────────────────────────┤
│  ✅ checkJsonlIdle mtime 캐시 적용      │
│  ✅ TextEncoder 재사용                  │
│  ✅ broadcast stringify 1회로 최적화    │
│  ✅ writeQueue shift() → 인덱스 기반    │
└─────────────────────────────────────────┘
  → CLI idle 시 3초 후 자동 접힘
```

## 헤더 상세

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `flex items-center gap-2 cursor-pointer` |
| 진행률 아이콘 | 전부 완료: `CheckCircle2` size=14 `text-positive` / 진행 중: `ListChecks` size=14 `text-ui-purple` |
| 진행률 텍스트 | `text-xs font-medium tabular-nums` — `"2 / 4"` |
| 접힌 상태 subject | `text-xs text-muted-foreground truncate flex-1 ml-1` |
| 접기/펼치기 아이콘 | `ChevronDown` size=14 `text-muted-foreground ml-auto` |
| 접힘 시 아이콘 회전 | `transition-transform duration-200 -rotate-90` |

## 체크리스트 목록 상세

### 항목 구성

```
┌──────────────────────────────────┐
│  [아이콘]  subject 텍스트         │
│   14px    text-sm truncate       │
└──────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 항목 컨테이너 | `flex items-center gap-2 py-0.5` |
| 아이콘 영역 | `shrink-0 w-[14px] h-[14px] flex items-center justify-center` |
| subject 텍스트 | `text-xs truncate min-w-0` |

### 상태별 아이콘

| 상태 | 아이콘 | 아이콘 스타일 |
|------|--------|-------------|
| `completed` | `CheckCircle2` size=14 | `text-positive` |
| `in_progress` | 커스텀 펄스 닷 (6px 원) | `bg-ui-purple animate-pulse rounded-full` |
| `pending` | 커스텀 빈 원 (14px) | `rounded-full border border-muted-foreground/40` |

### 상태별 텍스트

| 상태 | 텍스트 스타일 |
|------|-------------|
| `completed` | `text-muted-foreground line-through` |
| `in_progress` | `text-foreground font-medium` |
| `pending` | `text-muted-foreground` |

## 컨테이너 스타일

| 속성 | 값 |
|------|-----|
| 배치 | sticky `top-0 z-10` (contentRef 내부 첫 번째) |
| 배경 | `bg-muted/30 backdrop-blur-sm` |
| 좌측 보더 | `border-l-2` |
| 보더 색상 (진행 중) | `border-ui-purple` |
| 보더 색상 (전부 완료) | `border-positive` |
| 보더 색상 (전부 pending) | `border-muted-foreground/40` |
| 패딩 | `px-4 py-2` |
| 마진 | `mx-4 mb-2` |
| 라운드 | `rounded-md` |
| 등장 애니메이션 | `animate-in fade-in slide-in-from-top-1 duration-200` |

## 목록 스크롤 영역

| 속성 | 값 |
|------|-----|
| max-height | `max-h-[240px]` |
| overflow | `overflow-y-auto` |
| 스크롤바 | `scrollbar-thin` (tailwind-scrollbar 또는 CSS) |
| 마진 | `mt-1.5` (헤더와 간격) |

## 타임라인 축약 표시

### task-progress 엔트리 (타임라인 본문)

```
┌──────────────────────────────────────┐
│  [아이콘] subject 텍스트              │  ← 체크리스트 항목과 동일 아이콘
└──────────────────────────────────────┘
```

| 속성 | 값 |
|------|-----|
| 컨테이너 | `flex items-center gap-1.5 py-1` |
| 아이콘 | 상태별 동일 (completed/in_progress/pending) |
| 텍스트 | `text-xs text-muted-foreground` |
| action=create | subject 표시 |
| action=update | `"Task {taskId} → {status}"` 형태 |

## 빈 상태

- tasks 배열이 비어있으면 TaskChecklist 컴포넌트 자체가 렌더링되지 않음
- 타임라인에 아무런 영향 없음 (기존 동작 유지)

## 접근성

| 항목 | 처리 |
|------|------|
| 체크리스트 컨테이너 | `role="list"` `aria-label="Task 진행 상황"` |
| 각 항목 | `role="listitem"` |
| 헤더 토글 | `button` `aria-expanded={!collapsed}` `aria-controls="task-list"` |
| 진행률 | `aria-live="polite"` (변경 시 스크린 리더 알림) |
