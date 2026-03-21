# API 연동

## 개요

모바일 레이아웃은 새로운 API를 추가하지 않는다. 기존 데스크톱과 동일한 WebSocket, REST API, zustand 스토어를 공유한다.

## 기존 API 재활용

| API | 모바일 용도 |
|---|---|
| ws://api/terminal | 터미널 WebSocket (동일) |
| ws://api/timeline | 타임라인 WebSocket (동일) |
| GET /api/workspace | Workspace 목록/설정 |
| GET /api/timeline/session | 세션 정보 |
| GET /api/timeline/sessions | 세션 목록 |

## 클라이언트 훅

### useIsMobile

반응형 분기를 제공하는 훅.

```typescript
const useIsMobile: (breakpoint?: number) => boolean
// 기본 breakpoint: 768
// window.matchMedia 기반, 리스너 등록/해제
```

### 기존 훅 공유

| 훅 | 모바일 사용 |
|---|---|
| useLayout | Workspace/Pane/Surface 데이터 (동일) |
| useTerminal | xterm.js + WebSocket (cols/rows만 다름) |
| useTimeline | 타임라인 데이터 (동일) |
| useWorkspaceStore | Workspace 전환 (동일) |
| useTabMetadataStore | 탭 메타데이터 (동일) |

## 컴포넌트 구조

```
pages/index.tsx (또는 _app.tsx)
├── useIsMobile() 분기
│   ├── isMobile=true → MobileTerminalPage
│   └── isMobile=false → TerminalPage (기존)
│
MobileTerminalPage
├── MobileNavBar (상단 네비게이션)
├── MobileSurfaceView (단일 Surface 전체 화면)
│   ├── TerminalContainer (터미널 모드)
│   └── MobileClaudeCodePanel (Claude Code 모드)
├── MobileTabIndicator (하단 도트)
└── MobileNavigationSheet (트리 탐색 메뉴)
```

## 파일 구조

```
src/
├── components/features/
│   ├── terminal/              ← 기존 데스크톱 (변경 없음)
│   └── mobile/                ← 신규 모바일 전용
│       ├── mobile-terminal-page.tsx
│       ├── mobile-nav-bar.tsx
│       ├── mobile-surface-view.tsx
│       ├── mobile-tab-indicator.tsx
│       ├── mobile-navigation-sheet.tsx
│       └── mobile-claude-code-panel.tsx
├── hooks/
│   └── use-is-mobile.ts       ← 신규
└── pages/
    └── index.tsx              ← 기존 수정: useIsMobile 분기 추가
```
