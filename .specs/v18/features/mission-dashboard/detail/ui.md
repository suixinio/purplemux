# 화면 구성

## 전체 레이아웃

```
┌─────────────────────────────────────────────────┐
│  [앱 헤더]                                       │
├─────────────────────────────────────────────────┤
│  [← 돌아가기]  backend-bot  미션 현황            │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ 활성 미션 ──────────────────────────────┐   │
│  │                                           │   │
│  │  A 프로젝트 인증 시스템 교체        3/5   │   │
│  │  ████████████░░░░░░░░  🟠 1 blocked      │   │
│  │                                           │   │
│  │  ├── ✅ Task 1: 현행 분석                 │   │
│  │  │   ├── ✅ Step 1: 기존 코드 분석        │   │
│  │  │   ├── ✅ Step 2: 의존성 파악           │   │
│  │  │   └── ✅ Step 3: 영향 범위 정리        │   │
│  │  ├── 🔴 Task 2: 설계                     │   │
│  │  │   ├── 🟠 Step 1: 방식 비교 [blocked]  │   │
│  │  │   └── ○ Step 2: API 스펙 작성          │   │
│  │  ├── ○ Task 3: 구현 ┄┄┄┄┄┄              │   │
│  │  ├── ○ Task 4: 테스트 ┄┄┄┄┄┄             │   │
│  │  └── ○ Task 5: 마이그레이션 ┄┄┄┄          │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ▸ 완료된 미션 (2)                               │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 미션 카드

### 미션 헤더

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `border rounded-lg p-4 mb-3` |
| 미션 제목 | `text-sm font-medium` |
| 진행률 텍스트 | `text-xs text-muted-foreground tabular-nums ml-auto` — "3/5" |
| 프로그레스 바 | `h-1 rounded-full bg-muted mt-2` + `bg-ui-teal` 채움 |
| blocked 뱃지 | `text-xs text-ui-amber` — "🟠 1 blocked" (blocked Task 있을 때만) |

### 미션 상태 뱃지

| 상태 | 스타일 |
|------|--------|
| running | `text-ui-teal` — 진행 중 Task 존재 |
| blocked | `text-ui-amber` — blocked Task 존재 (running보다 우선) |
| completed | `text-positive` — 전체 완료 |
| failed | `text-negative` — 실패 Task 존재 |

## 태스크 트리 뷰

### 노드 구성

```
[상태아이콘] [제목]                    [링크]
   14px     text-sm                 optional
```

| 요소 | 스타일 |
|------|--------|
| 트리 컨테이너 | `ml-2 mt-3` |
| Task 노드 | `flex items-center gap-2 py-1.5` |
| Step 노드 | `flex items-center gap-2 py-1 ml-6` (들여쓰기) |
| 트리 선 | `border-l border-muted-foreground/15 ml-[7px]` |

### 상태별 아이콘

| 상태 | 아이콘 | 스타일 |
|------|--------|--------|
| `pending` | 빈 원 (14px) | `rounded-full border border-muted-foreground/40` |
| `running` | 펄스 닷 (6px) | `bg-ui-teal animate-pulse rounded-full` |
| `completed` | `CheckCircle2` size=14 | `text-positive` |
| `blocked` | `AlertCircle` size=14 | `text-ui-amber` |
| `failed` | `XCircle` size=14 | `text-negative` |

### 상태별 텍스트

| 상태 | 스타일 |
|------|--------|
| `pending` | `text-muted-foreground` |
| `running` | `text-foreground font-medium` |
| `completed` | `text-muted-foreground` |
| `blocked` | `text-ui-amber font-medium` |
| `failed` | `text-negative` |

### 롤링 계획 (미확정 Task)

| 요소 | 스타일 |
|------|--------|
| Task 제목 | `text-muted-foreground/60` (더 연하게) |
| 트리 선 | `border-dashed` (점선) |
| 아이콘 | 빈 원, `border-dashed` |

## blocked 태스크 팝오버

blocked 노드 클릭 시:

```
┌─────────────────────────────────┐
│ ⚠️ 사용자 확인 필요              │
│                                 │
│ "JWT와 Session 중 어떤 방식을    │
│  사용할까요?"                    │
│                                 │
│ [채팅에서 답변하기]               │
└─────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 팝오버 | `Popover` (shadcn) `w-72` |
| 헤더 | `text-xs font-medium text-ui-amber` + `AlertCircle` size=12 |
| 내용 | `text-sm text-muted-foreground mt-1` |
| 버튼 | `Button variant="outline" size="xs" mt-3` → 채팅 페이지 이동 |

## 병렬 태스크 표시

동시 실행 중인 Task (running 상태 여러 개):

```
├── 🟢 Task 3: API 구현        → project-a / tab-1
├── 🟢 Task 4: 프론트 구현     → project-b / tab-2
```

| 요소 | 스타일 |
|------|--------|
| 탭 링크 | `text-xs text-ui-blue hover:underline ml-auto` |
| 링크 아이콘 | `ExternalLink` size=10 |
| 클릭 | 해당 워크스페이스의 터미널 탭으로 이동 |

## 완료된 미션 섹션

- 아코디언 (기본 접힘): `▸ 완료된 미션 (2)`
- 클릭 시 펼침: 완료된 미션 카드 표시 (간략 버전 — 트리 접힘)

| 요소 | 스타일 |
|------|--------|
| 토글 | `text-sm text-muted-foreground cursor-pointer flex items-center gap-1` |
| 아이콘 | `ChevronRight` size=14, 펼침 시 `rotate-90 transition-transform` |

## 로딩/빈/에러 상태

### 로딩

미션 카드 스켈레톤 1개 (프로그레스 바 + 트리 라인 모양)

### 빈 상태

```
┌─────────────────────────────────────┐
│                                     │
│            📋                       │
│   아직 미션이 없습니다               │
│   채팅에서 에이전트에게               │
│   작업을 지시해보세요                │
│                                     │
│   [채팅으로 이동]                    │
└─────────────────────────────────────┘
```

## 접근성

| 항목 | 처리 |
|------|------|
| 트리 | `role="tree"` |
| Task 노드 | `role="treeitem"` `aria-expanded` |
| Step 노드 | `role="treeitem"` (하위) |
| 진행률 바 | `role="progressbar"` `aria-valuenow` `aria-valuemax` |
| blocked 팝오버 | `aria-haspopup="dialog"` |
