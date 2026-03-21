---
page: session-meta-bar
title: 세션 메타 바
route: /
status: CONFIRMED
complexity: High
depends_on:
  - .specs/v11/features/git-branch-api/spec.md
  - .specs/v8/features/claude-code-panel/spec.md
  - .specs/v8/features/session-parser/spec.md
  - .specs/v8/features/realtime-watch/spec.md
  - docs/STYLE.md
created: 2026-03-21
updated: 2026-03-21
assignee: ''
---

# 세션 메타 바

## 개요

Claude Code Panel 타임라인 상단에 고정 배치되는 메타데이터 바. 세션 제목, 시간, 메시지 수, 토큰 사용량을 컴팩트하게 한 줄로 표시하고, 클릭 시 git 브랜치, 입력/출력 토큰 분리 등 상세 정보로 확장한다. 기존 타임라인 데이터에서 파생하여 실시간으로 갱신된다.

## 주요 기능

### 컴팩트 레이아웃 (기본)

- 한 줄에 핵심 정보 나열: 제목 · 시간 · 턴 수 · 토큰
- 위치: 타임라인 영역 최상단, 세션 목록 네비게이션(← 세션 목록) 아래
- 고정 배치: 타임라인 스크롤 시에도 메타 바는 고정
- 각 항목은 `·` 구분자로 연결, `text-xs text-muted-foreground`
- 제목만 `text-sm font-medium text-foreground`

### 상세 레이아웃 (확장)

- 컴팩트 바 클릭 시 토글 확장
- 확장 시 표시:
  - 세션 제목 (전체 텍스트)
  - 생성 시간 / 최종 수정 시간 (절대 + 상대)
  - 메시지 수: 사용자 N / 어시스턴트 N
  - git 브랜치: lucide-react `GitBranch` 아이콘 + 브랜치명
  - 토큰: 입력 N / 출력 N / 총 N (쉼표 포맷)
- 확장 애니메이션: height transition 150ms
- 외부 클릭 또는 재클릭으로 접기

### 표시 항목 상세

#### 세션 제목

- 데이터: 세션 파일 내 `summary` 필드, 없으면 첫 `user-message` 텍스트
- 컴팩트: 최대 30자 truncate + ellipsis
- 상세: 전체 텍스트 (여러 줄 가능)

#### 시간

- 컴팩트: 마지막 활동 시간의 상대 표시 (dayjs `fromNow`)
- 상세: 생성 시간 + 수정 시간 (절대 `MM/DD HH:mm` + 상대)
- Tooltip: 절대 시간 전체 (`YYYY-MM-DD HH:mm:ss`)

#### 메시지 수

- 컴팩트: 총 턴 수 (user-message 카운트, 예: "12턴")
- 상세: 사용자 N / 어시스턴트 N

#### 토큰 사용량

- 세션 파서 확장: 각 메시지의 `usage.input_tokens`, `usage.output_tokens` 추출
- 증분 계산: `timeline:append` 수신 시 누적
- 컴팩트: 총합 K/M 단위 (예: "80.2K")
- 상세: 입력 50,234 / 출력 30,128 / 총 80,362 (쉼표 포맷)
- K 단위: 1,000+ → "1.2K", M 단위: 1,000,000+ → "1.2M"

#### git 브랜치

- 상세 모드에서만 표시 (컴팩트에서는 생략)
- `GET /api/git/branch?tmuxSession={name}` 으로 조회
- 30초 폴링 갱신
- 아이콘: lucide-react `GitBranch` (`size={12}`)
- 텍스트: `font-mono text-xs`

### 실시간 갱신

- `timeline:append` 수신 시:
  - 메시지 수: 엔트리 타입에 따라 카운터 증가
  - 토큰: 새 엔트리의 usage 합산
  - 최종 수정 시간: 새 엔트리 타임스탬프
- `timeline:init` 수신 시: 전체 재계산
- `timeline:session-changed` 수신 시: 초기화 + 새 세션 기준 재계산
- 상대 시간 표시: 1분 간격 자동 갱신 (`setInterval`)

### 조건부 표시

| 상태 | 메타 바 |
|---|---|
| 타임라인 뷰 (active 또는 inactive) | 표시 |
| 세션 목록 뷰 | 숨김 |
| panelType === 'terminal' | 숨김 |

### 다크 모드

- 메타 바 배경: `bg-background`
- 하단 구분: `border-b` (0.5px)
- 텍스트: muted 톤 (컴팩트), foreground (상세 제목)
- 확장 배경: `bg-muted/30`

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-21 | 초안 작성 | DRAFT |
