# API 연동

## 개요

모바일 Claude Code Panel은 새로운 API를 추가하지 않는다. 데스크톱과 동일한 WebSocket, REST API를 재활용하며, 기존 컴포넌트와 훅을 공유한다.

## 기존 API/컴포넌트 재활용

| 기능 | 데스크톱 소스 | 모바일 재활용 방식 |
|---|---|---|
| 타임라인 | TimelineView 컴포넌트 | 동일 컴포넌트, 모바일 너비에 반응 |
| 터미널 | TerminalContainer | 동일 컴포넌트, 축소 없이 100% |
| 입력창 | WebInputBar | 동일 컴포넌트, maxRows=3 prop으로 제한 |
| 세션 메타 바 | SessionMetaBar | 컴팩트만 사용, 상세는 바텀 시트로 래핑 |
| 세션 목록 | SessionListView | 동일 컴포넌트, 전체 화면 |
| 세션 네비게이션 | SessionNavBar | 동일 컴포넌트 |

## 모바일 전용 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| MobileClaudeCodePanel | 타임라인/터미널 탭 전환 + 입력창 래핑 |
| MobileMetaSheet | 메타 바 바텀 시트 (상세 표시) |

## 컴포넌트 구조

```
MobileClaudeCodePanel
├── SessionNavBar (← 세션 목록, 기존 재활용)
├── SessionMetaBar (컴팩트, 클릭 → MobileMetaSheet)
├── MobileMetaSheet (바텀 시트, 상세 정보)
├── 탭 전환:
│   ├── activeTab === 'timeline' → TimelineView
│   └── activeTab === 'terminal' → TerminalContainer (100%, 축소 없음)
├── SessionListView (세션 없을 때, 기존 재활용)
└── WebInputBar (하단 고정, maxRows=3)
```

## 파일 구조

```
src/components/features/mobile/
├── mobile-claude-code-panel.tsx   ← 탭 전환 + 입력창 래핑
└── mobile-meta-sheet.tsx          ← 메타 바 바텀 시트
```

## 공유 훅

| 훅 | 용도 |
|---|---|
| useTimeline | 타임라인 데이터 + cliState (동일) |
| useWebInput | 입력/전송 로직 (동일) |
| useSessionMeta | 메타 데이터 (동일) |
| useGitBranch | git 브랜치 폴링 (동일) |
| useSessionList | 세션 목록 (동일) |
| useSessionView | 뷰 전환 상태 (동일) |
