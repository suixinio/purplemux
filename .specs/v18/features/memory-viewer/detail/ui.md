# 화면 구성

## 전체 레이아웃

```
┌─────────────────────────────────────────────────┐
│  [앱 헤더]                                       │
├─────────────────────────────────────────────────┤
│  [← 돌아가기]  backend-bot  메모리               │
├───────────────────┬─────────────────────────────┤
│                   │                              │
│  🔍 검색...       │  shared/user.md              │
│                   │                              │
│  ▾ shared/        │  # 사용자 선호도              │
│    user.md        │                              │
│    global-...md   │  - 커밋 메시지 한글            │
│    ▸ projects/    │  - PR 크게 묶는 거 선호        │
│      ▾ proj-a/   │  - 코드 리뷰 꼼꼼하게          │
│        context.md │                              │
│        learnings  │                              │
│        index.md   │                              │
│      ▸ proj-b/   │                              │
│                   │                              │
│  ▾ backend-bot/ ← │  ─── 파일 정보 ───────────   │
│    config.md      │  크기: 1.2KB                  │
│    ▸ memory/      │  수정: 2026-04-04 10:30       │
│    ▸ missions/    │                              │
│                   │          [편집]               │
│                   │                              │
├───────────────────┴─────────────────────────────┤
│  전체: 15 파일, 24KB  │  backend-bot: 8 파일, 12KB │
└─────────────────────────────────────────────────┘
```

## 좌측 패널 — 트리 뷰

### 검색 바

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `px-3 py-2 border-b` |
| 입력 | `Input` size="sm" placeholder="검색..." |
| 아이콘 | `Search` size=14 `text-muted-foreground` (입력 좌측) |
| 클리어 | 텍스트 있을 때 `X` size=12 (입력 우측) |

### 트리 노드

| 요소 | 스타일 |
|------|--------|
| 디렉토리 | `flex items-center gap-1.5 py-1 px-2 cursor-pointer hover:bg-muted/50 rounded` |
| 디렉토리 아이콘 | `ChevronRight` size=12 (펼침 시 `rotate-90`) + `Folder` size=14 |
| 파일 | `flex items-center gap-1.5 py-1 px-2 pl-6 cursor-pointer hover:bg-muted/50 rounded` |
| 파일 아이콘 | `FileText` size=14 `text-muted-foreground` |
| 선택된 파일 | `bg-accent text-accent-foreground` |
| 들여쓰기 | 레벨당 `pl-4` 추가 |

### 파일 타입별 아이콘 색상

| 파일 | 아이콘 색상 |
|------|-----------|
| `config.md` | `text-ui-blue` |
| `learnings.md` | `text-ui-teal` |
| `context.md` | `text-ui-purple` |
| `index.md` | `text-ui-coral` |
| `user.md` | `text-ui-pink` |
| 기타 | `text-muted-foreground` |

### 현재 에이전트 강조

현재 보고 있는 에이전트의 디렉토리:
- 기본 펼침 상태
- 디렉토리명 `font-medium`

## 우측 패널 — 파일 뷰어

### 뷰어 모드

| 요소 | 스타일 |
|------|--------|
| 파일명 | `text-sm font-medium border-b px-4 py-2` |
| 마크다운 렌더링 | `prose prose-sm max-w-none px-4 py-4` |
| 파일 정보 | `border-t px-4 py-2 flex gap-4 text-xs text-muted-foreground` |
| 편집 버튼 | `Button variant="outline" size="xs"` — `Pencil` size=12 |

### 편집 모드

```
┌─────────────────────────────────────┐
│  shared/user.md            [미리보기] [저장] [취소] │
├─────────────────────────────────────┤
│                                     │
│  # 사용자 선호도                     │  ← textarea
│                                     │
│  - 커밋 메시지 한글                  │
│  - PR 크게 묶는 거 선호              │
│                                     │
└─────────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 에디터 | `Textarea` 전체 높이, `font-mono text-sm` |
| 미리보기 토글 | `Button variant="ghost" size="xs"` — `Eye` size=12 |
| 저장 | `Button variant="default" size="xs"` — `Save` size=12 |
| 취소 | `Button variant="ghost" size="xs"` |
| 미리보기 모드 | split view — 좌측 에디터, 우측 마크다운 렌더링 |

## 검색 결과

검색어 입력 시 트리 뷰가 검색 결과로 전환:

```
┌───────────────────┐
│  🔍 "커밋"         │
│                   │
│  shared/user.md   │
│    └ 커밋 메시지 한글로 작성  │
│                   │
│  proj-a/context   │
│    └ 커밋 컨벤션: conventional│
└───────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 결과 파일명 | `text-sm font-medium` |
| 매칭 라인 | `text-xs text-muted-foreground ml-4 truncate` |
| 하이라이트 | 매칭 텍스트 `bg-ui-amber/20 rounded` |
| 결과 클릭 | 해당 파일 뷰어로 이동 |

## 하단 통계 바

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `border-t px-4 py-2 flex gap-6 text-xs text-muted-foreground` |
| 전체 통계 | "전체: 15 파일, 24KB" |
| 에이전트 통계 | "backend-bot: 8 파일, 12KB" |

## 로딩/빈/에러 상태

### 로딩

- 좌측: 트리 스켈레톤 (라인 5개)
- 우측: 빈 패널

### 빈 상태 (메모리 없음)

우측 패널 중앙:

```
┌─────────────────────────────────────┐
│                                     │
│            📝                       │
│   에이전트가 아직 학습한              │
│   내용이 없습니다                    │
│                                     │
└─────────────────────────────────────┘
```

### 파일 읽기 에러

우측 패널: "파일을 읽을 수 없습니다" + 파일 경로 + 재시도 버튼

## 반응형

### 모바일 (< 768px)

- 트리와 뷰어를 탭으로 분리 (트리 탭 / 뷰어 탭)
- 파일 클릭 시 뷰어 탭으로 자동 전환

### 데스크탑

- split view — 좌측 트리 (w-64), 우측 뷰어 (flex-1)
- 리사이즈 핸들 (선택)

## 접근성

| 항목 | 처리 |
|------|------|
| 트리 | `role="tree"` |
| 디렉토리 | `role="treeitem"` `aria-expanded` |
| 파일 | `role="treeitem"` `aria-selected` |
| 검색 | `role="search"` |
| 에디터 | `aria-label="마크다운 편집"` |
| 키보드 | 트리에서 ↑↓ 탐색, Enter 선택/펼침 |
