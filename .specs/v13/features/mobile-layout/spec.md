---
page: mobile-layout
title: 모바일 레이아웃 및 반응형 분기
route: /
status: DETAILED
complexity: High
depends_on:
  - docs/STYLE.md
created: 2026-03-21
updated: 2026-03-21
assignee: ''
---

# 모바일 레이아웃 및 반응형 분기

## 개요

뷰포트 768px 기준으로 데스크톱/모바일 레이아웃을 자동 전환한다. 모바일에서는 Pane 분할 없이 단일 Surface를 전체 화면으로 표시하고, 상단 네비게이션 바와 하단 탭 인디케이터를 배치한다. 데스크톱 레이아웃은 일절 변경하지 않으며, 모바일은 별도 컴포넌트 트리로 구현한다.

## 주요 기능

### 반응형 분기

- JavaScript 기반 감지: `useMediaQuery` 또는 `window.matchMedia('(max-width: 767px)')`
- `< 768px` → 모바일 컴포넌트 트리 렌더링
- `>= 768px` → 기존 데스크톱 컴포넌트 트리 (변경 없음)
- 화면 회전(가로/세로) 시 자동 재조정 (matchMedia 리스너)
- 공통 로직(훅, zustand 스토어, WebSocket)은 공유, 렌더링만 분리

### 모바일 전체 화면 Surface

- 데스크톱의 Pane 분할을 무시하고, 선택된 단일 Surface만 전체 화면 렌더링
- Surface 내용: Terminal 또는 Claude Code Panel — 데스크톱과 동일한 xterm.js/타임라인 컴포넌트 재활용
- Pane 레이아웃 데이터는 그대로 유지 (모바일에서 변경하지 않음, 데스크톱 복귀 시 원래대로)

### 상단 네비게이션 바

- 좌측: 햄버거 메뉴 버튼 (lucide-react `Menu`)
- 중앙: 현재 위치 breadcrumb (`Workspace / Tab이름`)
- 우측: Claude Code 모드일 때 터미널 토글 버튼 (`Terminal` 아이콘)
- 높이: ~44px (터치 타겟 최소 요건)
- 배경: `bg-background`, 하단 `border-b` (0.5px)

### 하단 탭 인디케이터

- 같은 Pane 내 Surface 위치를 도트로 표시 (● ● ○)
- 도트 클릭 → 해당 Surface로 전환
- Surface가 1개면 숨김
- 높이: ~24px, `bg-background`, 상단 `border-t` (0.5px)

### 모바일 터미널 최적화

- xterm.js cols/rows: 모바일 뷰포트에 맞게 재계산
  - 세로 모드: ~40 cols, 가로 모드: ~80 cols
  - tmux 세션에 resize 전달 (기존 로직 재활용)
- 터미널 폰트: 최소 12px 보장
- 모바일 키보드: 최소한의 대응. 키보드가 올라오면 터미널이 위로 밀려나는 것 허용
- Safe Area: `env(safe-area-inset-*)` 적용 (노치, 홈바 영역)
- iOS Safari 오버스크롤 바운스: 터미널 영역에서 `overscroll-behavior: none`

### 모바일 생성/관리

- 네비게이션 바 또는 트리 메뉴에서 새 탭 생성 ("+" 버튼)
- 현재 Surface 닫기 버튼
- Workspace/Pane 생성은 데스크톱에서만

### 통계 페이지 모바일

- `/stats`: 단일 컬럼, 너비 100%
- 차트: recharts `ResponsiveContainer`로 반응형
- 기간 필터: 가로 스크롤 가능한 탭 그룹
- 카드/섹션 패딩 축소

### 첫 진입 동작

- 모바일 접속 시 마지막으로 활성이던 Workspace의 첫 번째 Surface를 자동 선택
- Workspace가 없으면 빈 상태 + "데스크톱에서 Workspace를 생성하세요" 안내

### 다크 모드

- 모바일에서도 기존 다크 모드 테마 동일 적용
- 네비게이션 바/인디케이터: 기존 토큰(`bg-background`, `border`, `text-foreground`)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-21 | 초안 작성 | DRAFT |
