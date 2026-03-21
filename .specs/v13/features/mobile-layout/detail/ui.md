# 화면 구성

## 전체 레이아웃

### 모바일 터미널 뷰

```
┌─────────────────────────────┐
│  ☰  project / Tab 1         │  ← 네비게이션 바 (44px)
│─────────────────────────────│
│                             │
│  $ ls -la                   │
│  drwxr-xr-x  5 user ...    │  ← 전체 화면 터미널
│  -rw-r--r--  1 user ...    │
│  $ _                        │
│                             │
│                             │
│─────────────────────────────│
│         ● ● ○               │  ← 탭 인디케이터 (24px)
│─────────────────────────────│
│    safe-area-inset-bottom   │
└─────────────────────────────┘
```

### 모바일 Claude Code 뷰

```
┌─────────────────────────────┐
│  ☰  project / claude   [⌨]  │  ← 네비게이션 바 + 토글
│─────────────────────────────│
│  "버그 수정해줘" · 5분 전     │  ← 메타 바 (컴팩트)
│─────────────────────────────│
│                             │
│  [타임라인 전체 화면]         │
│  ├─ 14:30 사용자: "..."     │
│  ├─ 14:31 Edit main.ts     │
│  └─ 14:32 Claude: "..."    │
│                             │
│─────────────────────────────│
│  메시지를 입력하세요...   ⏎  │  ← 하단 고정 입력창
│─────────────────────────────│
│    safe-area-inset-bottom   │
└─────────────────────────────┘
```

## 네비게이션 바

```
┌─────────────────────────────┐
│  ☰   project / Tab 1   [⌨] │
└─────────────────────────────┘
```

- 높이: 44px
- 좌측: `Menu` 아이콘 (`size={20}`, 터치 영역 44x44px)
- 중앙: breadcrumb `text-sm font-medium text-foreground truncate`
  - Workspace 이름 `text-muted-foreground` / Surface 이름 `text-foreground`
- 우측: 터미널 토글 (Claude Code 모드일 때만)
  - `Terminal` 또는 `MessageSquare` 아이콘 (`size={18}`)
  - 활성 탭: `text-foreground`, 비활성: `text-muted-foreground`
- 배경: `bg-background`, 하단 `border-b` (0.5px)
- Safe Area: `padding-top: env(safe-area-inset-top)`

## 탭 인디케이터

```
┌─────────────────────────────┐
│           ● ● ○             │
└─────────────────────────────┘
```

- 높이: 24px
- 도트: `w-2 h-2 rounded-full`
  - 현재 Surface: `bg-foreground`
  - 기타: `bg-muted-foreground/30`
- 도트 간격: `gap-1.5`
- 중앙 정렬
- Surface가 1개면 전체 영역 숨김
- 도트 클릭: 해당 Surface로 전환 (터치 영역 최소 24x24px)
- 배경: `bg-background`, 상단 `border-t` (0.5px)

## 빈 상태 (Workspace 없음)

```
┌─────────────────────────────┐
│  ☰                          │
│─────────────────────────────│
│                             │
│      ○ Workspace 없음        │
│                             │
│  데스크톱에서 Workspace를     │
│  생성하세요                   │
│                             │
└─────────────────────────────┘
```

- 중앙 정렬, `text-muted-foreground`
- 아이콘: lucide-react `Monitor` (`size={32}`, muted)

## 반응형/접근성

- 모든 터치 타겟: 최소 44x44px
- Safe Area: `env(safe-area-inset-*)` 전체 적용
- 오버스크롤: 터미널 영역 `overscroll-behavior: none`
- 다크 모드: 데스크톱과 동일 토큰
