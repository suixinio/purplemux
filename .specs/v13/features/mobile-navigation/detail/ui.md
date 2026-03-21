# 화면 구성

## 트리 탐색 메뉴 (Sheet)

```
┌─────────────────────────────┐
│  ✕  Workspaces               │  ← 헤더
│─────────────────────────────│
│                              │
│  ▾ project-a                 │  ← 현재 Workspace (펼침)
│    ├── Pane 1            [+] │
│    │   ├─ 🖥 Tab 1           │
│    │   └─ 🤖 Tab 2 (claude) ●│  ← 현재 선택
│    └── Pane 2            [+] │
│        └─ 🖥 Tab 3           │
│                              │
│  ▸ project-b                 │  ← 다른 Workspace (접힘)
│  ▸ project-c                 │
│                              │
│  ─────────────────────────── │
│  📊 통계                      │  ← 하단 링크
└─────────────────────────────┘
```

## 헤더

- 좌측: `X` 닫기 버튼 (`size={20}`, 터치 영역 44x44px)
- 중앙: "Workspaces" (`text-sm font-medium`)
- 배경: `bg-background`, 하단 `border-b`

## Workspace 항목

```
┌─────────────────────────────┐
│  ▾ project-a                 │
└─────────────────────────────┘
```

- 높이: 44px (`py-3 px-4`)
- 좌측: 펼침/접힘 아이콘 (`ChevronDown`/`ChevronRight`, `size={14}`)
- 텍스트: 프로젝트명 `text-sm`
- 현재 활성: `bg-muted font-medium`
- 비활성: `text-foreground`
- 클릭: 아코디언 토글

## Surface 항목

```
┌─────────────────────────────┐
│      🖥 Tab 1                │
│      🤖 Tab 2 (claude) ●     │
└─────────────────────────────┘
```

- 높이: 40px (`py-2.5 px-6`, 들여쓰기)
- 좌측: 패널 타입 아이콘
  - Terminal: `Terminal` (`size={14}`, `text-muted-foreground`)
  - Claude Code: `BotMessageSquare` (`size={14}`, `text-ui-purple`)
- 텍스트: 탭 이름 `text-sm`
- 현재 선택: 우측 `●` 마커 (`text-ui-purple`), 텍스트 `font-medium`
- 클릭: 메뉴 닫힘 + Surface 전환

## Pane 헤더 + 새 탭 버튼

```
┌─────────────────────────────┐
│    ├── Pane 1            [+] │
└─────────────────────────────┘
```

- Pane 레이블: `text-xs text-muted-foreground` ("Pane 1")
- 우측: `Plus` 아이콘 (`size={14}`, 터치 영역 44x44px)
- `+` 클릭: 해당 Pane에 새 탭 생성

## 탭 닫기

- Surface 항목 길게 누르기 (500ms) → 컨텍스트 액션 표시
  - "닫기" 버튼 (`text-ui-red`)
  - 마지막 탭이면 "닫기" 비활성
- 또는: Surface 항목 우측에 상시 `X` 버튼 (마지막 탭은 숨김)

## 통계 링크

```
┌─────────────────────────────┐
│  📊 통계                      │
└─────────────────────────────┘
```

- 위치: 메뉴 하단, 구분선 아래
- `BarChart3` 아이콘 + "통계" 텍스트
- 클릭 → `/stats` 라우트로 이동

## Sheet 애니메이션

- 열기: 좌측에서 슬라이드인, 200ms ease-out
- 닫기: 좌측으로 슬라이드아웃, 150ms ease-in
- 배경 오버레이: `bg-black/50`, fade in/out
- shadcn/ui `Sheet` side="left" 활용
