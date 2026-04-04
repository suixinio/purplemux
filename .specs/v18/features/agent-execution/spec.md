---
page: agent-execution
title: 에이전트 실행 구조
route: (서버 내부 로직 — UI 없음)
status: DETAILED
complexity: High
depends_on:
  - docs/TMUX.md
  - docs/STATUS.md
created: 2026-04-04
updated: 2026-04-04
assignee: ''
---

# 에이전트 실행 구조

## 개요

에이전트가 **사람이 purplemux를 쓰는 방식과 완전히 동일하게** 작업을 수행하는 실행 엔진. 에이전트 Claude Code 세션(Brain)은 직접 코드를 수정하지 않고, purplemux의 워크스페이스에 탭을 생성하여 별도의 Claude Code 세션에 작업을 위임한다. 서버는 에이전트가 탭을 제어할 수 있도록 tmux API를 제공하고, 태스크 탭의 완료/실패를 감지하여 에이전트에 알린다.

### 현재 문제

에이전트가 단일 Claude Code 세션에서 직접 파일을 수정하는 구조. 사람이 purplemux를 사용하는 방식(탭 생성 → Claude Code 대화 → 완료 → 닫기)과 다르며, 병렬 태스크, 프로젝트별 컨텍스트 분리, 실시간 관찰이 불가능하다.

### 목표 구조

```
에이전트 Brain (오케스트레이터)
  ~/.purplemux/agents/{id}/ 에서 실행
  │
  ├─ 미션 분석 → 태스크 분리
  ├─ 프로젝트 워크스페이스에 탭 생성 (tmux)
  │   ├─ 탭 1: Claude Code → Task A 실행
  │   ├─ 탭 2: Claude Code → Task B 실행 (병렬)
  │   └─ 탭 3: Claude Code → Task C 실행 (병렬)
  ├─ 탭 상태 모니터링 (서버가 감지 → 에이전트에 알림)
  ├─ 완료된 탭 결과 확인 → 다음 태스크 진행
  └─ 사용자에게 relay로 진행상황 리포트
```

## 주요 기능

### 1. 에이전트 탭 제어 API

에이전트 Brain이 curl로 호출하여 purplemux 탭을 제어하는 HTTP API.

- **탭 생성** — `POST /api/agent/{agentId}/tab`
  - 지정한 워크스페이스(프로젝트)에 새 탭 생성
  - 탭에서 Claude Code 세션 자동 시작 (`claude --dangerously-skip-permissions`)
  - 프로젝트의 기존 CLAUDE.md가 그대로 적용됨 (에이전트 전용 분기 없음)
  - 응답: `{ tabId, workspaceId, tmuxSession }`

- **탭에 메시지 전송** — `POST /api/agent/{agentId}/tab/{tabId}/send`
  - 해당 탭의 Claude Code 세션에 `tmux send-keys`로 지시 전달
  - Claude Code가 idle 상태일 때만 전달 (busy면 큐잉)
  - 에이전트가 Step 단위로 대화를 주고받으며 작업 진행

- **탭 상태 조회** — `GET /api/agent/{agentId}/tab/{tabId}/status`
  - 기존 상태 감지 로직 재사용 (pane title, 세션 감지)
  - 응답: `{ status: 'idle' | 'working' | 'completed' | 'error', lastActivity }`

- **탭 결과 읽기** — `GET /api/agent/{agentId}/tab/{tabId}/result`
  - 우선순위: `.task-result.md` → Claude Code jsonl 파싱 → `tmux capture-pane` 버퍼
  - 응답: `{ content, source: 'file' | 'jsonl' | 'buffer' }`

- **탭 닫기** — `DELETE /api/agent/{agentId}/tab/{tabId}`
  - tmux 세션 종료 + 서버 내부 탭 매핑 정리

### 2. 태스크 탭 상태 감시

서버가 에이전트가 생성한 모든 탭을 모니터링하고, 상태 변화를 에이전트에 자동 알림.

- **기존 상태 감지 로직 재사용** — pane title, Claude Code 세션 감지, jsonl 파싱
- **완료 감지** — Claude Code 세션이 idle로 전환되고 `.task-result.md`가 존재하면 완료로 판정
- **실패 감지** — 세션 크래시, 에러 패턴 매칭
- **에이전트에 알림** — `tmux send-keys`로 에이전트 Brain 세션에 결과 전달
  - 예: `"[TAB_COMPLETE] tabId=xxx status=completed result=..."`
  - 에이전트는 폴링 없이 이벤트 수신만 함
- **WebSocket broadcast** — `workspace:tab-updated` 이벤트로 UI에도 실시간 반영

### 3. 에이전트 Brain CLAUDE.md

에이전트 Brain이 탭 제어 API를 사용하도록 안내하는 CLAUDE.md.

- **역할/페르소나** 정의 (`config.md`의 name, role 반영)
- **담당 프로젝트** 목록과 각 프로젝트의 워크스페이스 ID 매핑
- **탭 제어 API** curl 명령어 가이드 (생성, 메시지 전송, 상태 조회, 결과 읽기, 닫기)
- **relay 통신 API** curl 명령어 (사용자에게 보고/질문)
- **작업 흐름 가이드**:
  1. 미션을 받으면 태스크로 분리
  2. 각 태스크마다 프로젝트 워크스페이스에 탭 생성
  3. 탭에 Claude Code 지시 전송
  4. 완료 알림 대기 → 결과 확인
  5. 사용자에게 진행상황/완료 리포트
- **결과 확인 규칙**: 탭의 `.task-result.md` 우선, 없으면 결과 조회 API 사용

### 4. 기존 인프라 재사용 (에이전트 전용 분기 없음)

- **tmux 세션/탭 생성** — 기존 `createSession`, `sendKeys` 등 `lib/tmux.ts` 함수 재사용
- **상태 감지** — 기존 `detectActiveSession`, `deriveStatus` 로직 그대로 사용
- **워크스페이스 관리** — 기존 `workspace-store.ts` API로 워크스페이스/탭 조회
- **탭 UI 표시** — 에이전트가 생성한 탭도 일반 탭과 동일하게 UI에 표시됨
- **사용자 관찰** — 에이전트 탭을 클릭하면 일반 터미널처럼 실시간 관찰 가능 (read-only 권장)

### 5. 안전장치

- **동시 탭 제한** — 에이전트당 최대 동시 실행 탭 수 설정 (기본 5개)
- **유효성 검증** — 탭 생성 시 워크스페이스 존재 여부, 프로젝트 디렉토리 존재 여부 확인
- **탭 소유권** — 각 탭에 `agentId` 태그 → 에이전트가 자기 탭만 제어 가능
- **자동 정리** — 에이전트 삭제 시 해당 에이전트가 생성한 모든 탭 종료
- **세션 복구** — 서버 재시작 시 기존 에이전트-탭 매핑 복원

### 6. 성능

- **탭 상태 폴링** — 기존 상태 감지 로직과 동일한 주기 (5초)
- **알림 전달** — `tmux send-keys`는 즉시 실행 (네트워크 지연 없음)
- **결과 읽기** — 파일 우선 (I/O 1회), jsonl은 tail 8KB만 파싱
- **API 인증 제외** — 에이전트 탭 제어 API도 relay와 동일하게 localhost only + proxy 인증 제외

### 7. 에러 처리

- 탭 생성 실패 시 에이전트에 에러 응답 → 에이전트가 재시도 판단
- 탭 세션 크래시 시 서버가 감지 → 에이전트에 `[TAB_ERROR]` 알림
- 워크스페이스 미존재 시 400 에러 + 사용 가능한 워크스페이스 목록 응답
- API 타임아웃 30초 (tmux 세션 생성 포함)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-04-04 | 초안 작성 | DRAFT |
| 2026-04-04 | 상세 문서 작성 (ui/flow/api) | DETAILED |
