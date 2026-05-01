---
page: codex-session-list
title: Codex 세션 목록
route: (Codex 세션 목록 sheet)
status: DETAILED
complexity: Medium
depends_on:
  - docs/DATA-DIR.md
  - docs/STYLE.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex 세션 목록

## 개요

`~/.codex/sessions/YYYY/MM/DD/*.jsonl` 일자 파티셔닝 디렉토리를 스캔해 워크스페이스 cwd 기준 codex 세션을 목록화한다. 사용자가 어떤 세션인지 빠르게 식별할 수 있도록 시작 시간/cwd/첫 user message 미리보기를 함께 노출한다.

## 주요 기능

### 1. `listCodexSessions({ cwd })` 구현

- `~/.codex/sessions/YYYY/MM/DD/` 일자 파티셔닝 디렉토리 재귀 스캔
- 각 jsonl 파일의 첫 줄(`session_meta`) 추출 → `ISessionMeta` 변환
- cwd 필터로 워크스페이스에 속한 세션만 반환
- 결과: 시작 시간 desc 정렬

### 2. 디렉토리 스캔 비용 가드

일자 파티셔닝이라 디렉토리 수가 점점 늘어남. 비용 가드:

- 최근 N일(기본 30일)만 스캔 — 이전은 archived 취급 (`~/.codex/archived_sessions/`)
- 첫 줄만 read (`fs.createReadStream` + line 1 break) — 전체 파일 파싱 안 함
- session-meta-cache 활용 (path → meta) — 동일 파일 재read 회피
- 사용자가 세션 검색/필터링 원하면 예정 작업 (SQLite state DB)으로 위임

### 3. UI — Codex 세션 목록 sheet

- Notification sheet와 유사한 사이드 sheet (모바일은 bottom sheet)
- 항목 구성:
  - 첫 user message 미리보기 (1줄, ellipsis)
  - 시작 시간 (relative: "3시간 전")
  - cwd (마지막 디렉토리명, full path tooltip)
  - 토큰 합계 (Phase 4 stats 통합 후)
- 클릭 시 `codex resume <id>` 인자로 새 탭 launch

### 4. UX 완성도 — 토스급

- **빠르다 (성능)**:
  - 가상 스크롤 (react-virtuoso 또는 동등) — 100+ 세션 부드러운 스크롤
  - prefetch: sheet 열기 직전 (`onMouseEnter` 메뉴 항목) `listCodexSessions` 워밍
  - meta-cache 활용으로 1회 스캔 후 메모리에서 재사용
- **로딩/빈/에러 상태**:
  - 로딩: skeleton (3개 항목 placeholder)
  - 빈: "이 워크스페이스에 codex 세션이 없습니다" + "Codex 새 대화" 버튼
  - 에러: "세션 목록 로드 실패" + Retry 버튼
- **인터랙션**:
  - 항목 hover: 배경 강조 + 모델명 tooltip
  - 클릭 시 즉시 sheet 닫고 새 탭 활성화 (낙관적 UI)

### 5. 권한 — 모바일

- 모바일은 bottom sheet, 항목 높이 `min-h-14` (56px) + 터치 타겟
- 항목 swipe 액션은 v19에선 없음 (예정 작업)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
| 2026-05-01 | 상세 문서 작성 (ui/flow/api) | DETAILED |
