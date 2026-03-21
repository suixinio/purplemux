---
page: mobile-navigation
title: 모바일 트리 탐색 네비게이션
route: /
status: DETAILED
complexity: Medium
depends_on:
  - .specs/v13/features/mobile-layout/spec.md
  - docs/STYLE.md
created: 2026-03-21
updated: 2026-03-21
assignee: ''
---

# 모바일 트리 탐색 네비게이션

## 개요

데스크톱의 사이드바를 대체하는 모바일 전용 네비게이션. 햄버거 메뉴를 통해 Workspace → Pane → Surface를 트리 구조로 탐색하여 원하는 Surface를 선택한다. 새 탭 생성과 탭 닫기도 이 메뉴에서 제공한다.

## 주요 기능

### 햄버거 메뉴

- 네비게이션 바 좌측의 `Menu` 아이콘 클릭 → 메뉴 열기
- 전체 화면 슬라이드인 시트 (좌측에서 등장, 또는 shadcn/ui `Sheet`)
- 배경 오버레이: 반투명 배경 (`bg-black/50`), 클릭 시 메뉴 닫힘
- 열기/닫기 애니메이션: slide + fade, 200ms

### Workspace 목록

- 메뉴 상단: "Workspaces" 헤더
- 각 Workspace 항목: 프로젝트 이름 (디렉토리 마지막 세그먼트) + 아이콘
- 현재 활성 Workspace 하이라이트 (`bg-muted`, `font-medium`)
- 클릭 → 해당 Workspace의 Pane/Surface 트리 펼침 (아코디언)

### Pane/Surface 트리

- Workspace 하위에 Pane 목록, 각 Pane 하위에 Surface 목록
- Surface 항목: 탭 이름 + 패널 타입 아이콘 (Terminal: `Terminal`, Claude Code: `BotMessageSquare`)
- 현재 선택된 Surface: `●` 마커 + `ui-purple` 액센트
- Surface 클릭 → 메뉴 닫힘 + 해당 Surface 전체 화면 전환
- Pane이 1개이고 Surface도 1개면 트리 생략하고 바로 Surface 표시

### 새 탭 생성

- 각 Pane 하위에 "+" 버튼 (lucide-react `Plus`, `size={16}`)
- 클릭 → 해당 Pane에 새 Surface(탭) 생성
- 생성 후 자동으로 새 탭 선택 + 메뉴 닫힘
- 기존 데스크톱의 탭 생성 로직 재활용

### 탭 닫기

- Surface 항목을 좌로 스와이프하면 삭제 버튼 노출 (iOS 스타일)
  - 또는 항목 길게 누르기 → 컨텍스트 메뉴에 "닫기" 옵션
- 마지막 탭은 닫을 수 없음 (데스크톱과 동일)
- 닫기 시 확인 없이 즉시 실행 (터미널은 tmux 세션 종료)

### 통계 링크

- 메뉴 하단: `BarChart3` 아이콘 + "통계" 링크
- 클릭 → `/stats` 페이지로 이동

### 터치 타겟

- 모든 항목: 최소 44px 높이
- Workspace 항목: `py-3 px-4`
- Surface 항목: `py-2.5 px-6` (들여쓰기)
- 버튼: 최소 44x44px 터치 영역

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-21 | 초안 작성 | DRAFT |
