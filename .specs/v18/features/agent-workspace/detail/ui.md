# 화면 구성

## 전체 레이아웃

```
┌─────────────────────────────────────────────────┐
│  [앱 헤더]                                       │
├─────────────────────────────────────────────────┤
│  [← 돌아가기]  backend-bot  워크스페이스          │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ 활동 요약 ──────────────────────────────┐   │
│  │  실행 중 2  │  완료 5  │  가동 2h 15m     │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌─ 에이전트 두뇌 세션 ─────────────────────┐   │
│  │  🟢 계획 수립 중                          │   │
│  │  agent-{agentId} 세션                     │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌─ project-a ──────────────────────────────┐   │
│  │                                           │   │
│  │  🟢 Task 3: API 구현      tab-1   [보기] │   │
│  │  ✅ Task 1: 현행 분석      tab-3          │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌─ project-b ──────────────────────────────┐   │
│  │                                           │   │
│  │  🟢 Task 4: 프론트 구현    tab-2   [보기] │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ▸ 최근 활동 (5)                                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 활동 요약

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `flex gap-6 border rounded-lg px-4 py-3 mb-4` |
| 항목 라벨 | `text-xs text-muted-foreground` |
| 항목 값 | `text-lg font-semibold tabular-nums` |
| 실행 중 수 | `text-ui-teal` |
| 완료 수 | `text-positive` |
| 가동 시간 | `text-foreground` |

## 에이전트 두뇌 세션

에이전트 자체의 Claude Code 세션 (계획/관리 용도).

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `border rounded-lg p-3 mb-4 bg-muted/30` |
| 상태 아이콘 | 상태별 펄스 닷/체크 등 (mission-dashboard와 동일) |
| 라벨 | `text-sm font-medium` — "계획 수립 중" / "대기 중" |
| 세션명 | `text-xs text-muted-foreground` |

## 프로젝트 그룹

### 그룹 헤더

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `border rounded-lg p-3 mb-3` |
| 프로젝트명 | `text-sm font-medium flex items-center gap-2` |
| 아이콘 | `Folder` size=14 `text-muted-foreground` |
| 워크스페이스 링크 | `text-xs text-ui-blue ml-auto hover:underline` |

### 탭 항목

```
[상태아이콘] [Task명]           [탭명]  [보기]
   14px     text-sm            text-xs  Button
```

| 요소 | 스타일 |
|------|--------|
| 항목 컨테이너 | `flex items-center gap-2 py-2 px-2 rounded hover:bg-muted/50` |
| 상태 아이콘 | mission-dashboard와 동일 (running/completed/...) |
| Task명 | `text-sm flex-1` |
| 탭명 | `text-xs text-muted-foreground` |
| 보기 버튼 | `Button variant="ghost" size="xs"` — running 상태일 때만 표시 |
| 보기 클릭 | 해당 워크스페이스/탭으로 이동 (관찰 모드) |

### 관찰 모드

터미널 탭으로 이동 시 관찰 모드 활성화:

| 요소 | 스타일 |
|------|--------|
| 상단 배너 | `bg-ui-amber/10 text-ui-amber text-xs px-4 py-2 flex items-center gap-2` |
| 아이콘 | `Eye` size=12 |
| 텍스트 | "관찰 모드 — 에이전트가 작업 중입니다" |
| 닫기 | `Button variant="ghost" size="icon-xs"` `X` → 워크스페이스로 복귀 |
| 입력 차단 | 터미널 입력 비활성화 (키 이벤트 무시) |

## 최근 활동 타임라인

접히는 아코디언. 에이전트의 최근 행동 로그.

```
▸ 최근 활동 (5)

  10:42  Task 3: API 구현 시작         project-a
  10:35  Task 2: 설계 blocked          project-a
  10:30  Task 1: 현행 분석 완료         project-a
  10:28  에이전트 시작
```

| 요소 | 스타일 |
|------|--------|
| 타임스탬프 | `text-xs text-muted-foreground tabular-nums w-12` |
| 활동 텍스트 | `text-xs` |
| 프로젝트 | `text-xs text-muted-foreground ml-auto` |
| 항목 간격 | `py-1.5` |

## 로딩/빈/에러 상태

### 로딩

활동 요약 스켈레톤 + 프로젝트 그룹 스켈레톤 2개

### 빈 상태

```
┌─────────────────────────────────────┐
│                                     │
│            ⚡                       │
│   에이전트가 아직 작업을              │
│   시작하지 않았습니다                │
│                                     │
│   채팅에서 미션을 지시해보세요        │
│   [채팅으로 이동]                    │
│                                     │
└─────────────────────────────────────┘
```

### 에이전트 offline

```
┌─────────────────────────────────────┐
│  ⚠️ 에이전트가 오프라인입니다         │
│                          [재시작]    │
└─────────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 배너 | `bg-negative/10 border border-negative/20 rounded-lg p-3` |
| 재시작 버튼 | `Button variant="outline" size="xs"` |

## 접근성

| 항목 | 처리 |
|------|------|
| 프로젝트 그룹 | `role="region"` `aria-label="project-a 탭 목록"` |
| 탭 목록 | `role="list"` |
| 관찰 모드 배너 | `role="alert"` |
| 활동 타임라인 | `role="log"` |
