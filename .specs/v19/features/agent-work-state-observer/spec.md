---
page: agent-work-state-observer
title: Agent Work State Observer 정식 구독
route: (서버 내부 — provider observer 슬롯)
status: DETAILED
complexity: Medium
depends_on:
  - docs/STATUS.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Agent Work State Observer 정식 구독

## 개요

Phase 1~3에서는 hook 핸들러가 `translateCodexHookEvent` helper를 통해 `status-manager.updateTabFromHook`을 직접 호출하는 단순 패턴을 사용했다. Phase 4에서 `IAgentProvider.attachWorkStateObserver` 슬롯의 Step 5 TODO를 정식 구현해 Claude/Codex 양쪽이 hook 채널 + jsonl tail을 단일 emit으로 통합한다.

## 주요 기능

### 1. attachWorkStateObserver 슬롯 정식 구현

`IAgentProvider.attachWorkStateObserver`:

- Phase 1~3: 비워둠. hook 핸들러가 helper(`translateXxxHookEvent`)로 변환 후 status-manager 직접 호출
- Phase 4: provider별 observer가 `(panePid, callback) → unsubscribe` 시그니처로 통합 emit
- status-manager는 단일 subscribe만 — 더 이상 hook endpoint에서 직접 호출 안 함

### 2. 통합 emit 채널

- **Hook 채널**: `globalThis.__ptCodexHookEvents` / `__ptClaudeHookEvents` (EventEmitter)
- **JSONL tail**: 신규 user/assistant message가 jsonl에 append되면 emit (현재 timeline-server 따로 관리하던 것과 통합 가능)
- 두 source를 provider observer 안에서 merge → 단일 `TAgentWorkStateEvent` stream으로 callback

### 3. Claude / Codex 양쪽 마이그

- Claude observer:
  - 기존 `~/.claude/projects/<proj>/` fs.watch + jsonl parsing 로직을 observer로 이동
  - hook 채널(이미 존재)도 함께 listen
- Codex observer:
  - hook 채널(`__ptCodexHookEvents`) 단독 listen (디렉토리 fs.watch 회피 — Phase 1 결정)
  - transcript_path는 hook payload에서 직접 받음

### 4. status-manager 단순화

- Phase 4 후엔 hook endpoint 핸들러는 `globalThis.__pt<Provider>HookEvents.emit` 만 수행
- status-manager는 provider observer 통해서만 subscribe → 분기 로직 단일화
- 기존 `updateTabFromHook` 직접 호출 사이트 → observer callback 경로로 마이그

### 5. 회귀 검증

- Claude:
  - SessionStart / UserPromptSubmit / Stop / Notification 모두 정상 도달
  - jsonl append으로 timeline 갱신 정상
  - busy ↔ idle 전환 무회귀 (status-resilience F1/F2 영향 없음 확인)
- Codex:
  - SessionStart (startup/resume/clear) source 분기 정상
  - PermissionRequest 정상 도달 (permission-prompt-item 활성화)
  - /clear 시 세션 갈아끼우기 timeline-server 메커니즘 정상 동작
- 양쪽 동시 실행:
  - Claude 탭 + Codex 탭 동시 → 각 observer 독립 emit, status-manager 분리 처리
  - hook 폭주 (단시간 다수 이벤트) — observer 큐잉/throttle 영향 측정

### 6. 성능

- observer 통합으로 이벤트 dispatch hop 감소 (hook → endpoint → helper → manager → observer 대신 hook → observer → manager)
- jsonl tail은 기존 timeline-server와 채널 통합 가능 — 중복 fs.watch 1개 제거 (Claude만 해당)
- 폴링 사이클 영향 없음 (observer는 push 모델)

### 7. 마이그 전략 — 하위 호환

- Phase 4 작업은 **단일 PR로 마이그**:
  - Claude observer 정식 구현 + 기존 helper 사이트 제거
  - Codex observer 정식 구현 + 기존 helper 사이트 제거
  - status-manager `updateTabFromHook` direct call 사이트 → observer callback 경로
- helper 함수(`translateXxxHookEvent`)는 observer 내부에서 계속 사용 (코드 재사용)
- legacy fallback 없음 — observer 슬롯 비어있는 경우 발견되면 build error

### 8. 테스트 전략

- Claude/Codex 양쪽 풀 turn 시나리오 수동 검증
- 양쪽 동시 실행 30분 stress test (hook 폭주 + jsonl append 빈번)
- 메모리 누수 체크 (observer unsubscribe 정상 동작)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
| 2026-05-01 | 상세 문서 작성 (ui/flow/api) | DETAILED |
