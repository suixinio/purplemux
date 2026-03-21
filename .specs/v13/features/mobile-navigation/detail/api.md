# API 연동

## 개요

모바일 트리 탐색은 새로운 API를 추가하지 않는다. 기존 zustand 스토어와 API를 재활용한다.

## 데이터 소스

| 데이터 | 소스 | 용도 |
|---|---|---|
| Workspace 목록 | `useWorkspaceStore` | 메뉴 Workspace 리스트 |
| Pane/Surface 구조 | `useLayout` (layout.json) | 트리 구조 렌더링 |
| 현재 선택 Surface | `useLayout` 활성 상태 | 하이라이트 표시 |
| 탭 메타데이터 | `useTabMetadataStore` | 탭 이름, 패널 타입 |

## 탭 생성/닫기

기존 데스크톱의 로직을 재활용한다.

| 동작 | 함수/API | 비고 |
|---|---|---|
| 새 탭 생성 | `useLayout`의 `addTab()` | tmux 세션 생성 + layout 업데이트 |
| 탭 닫기 | `useLayout`의 `removeTab()` | tmux 세션 종료 + layout 업데이트 |

## 컴포넌트 구조

```
MobileNavigationSheet
├── SheetHeader (✕ + "Workspaces")
├── WorkspaceList
│   └── WorkspaceItem (아코디언)
│       └── PaneGroup
│           ├── PaneHeader (이름 + [+] 버튼)
│           └── SurfaceItem[] (클릭 → 선택)
├── Separator
└── StatsLink (📊 통계)
```

## 파일 구조

```
src/components/features/mobile/
├── mobile-navigation-sheet.tsx   ← Sheet 컨테이너
├── mobile-workspace-list.tsx     ← Workspace 목록 + 아코디언
├── mobile-pane-group.tsx         ← Pane 헤더 + Surface 리스트
└── mobile-surface-item.tsx       ← Surface 항목 (클릭/길게 누르기)
```
