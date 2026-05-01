---
page: codex-permission-prompt
title: Codex 권한 응답 UI
route: (Codex 패널 인라인 + permission-prompt-item)
status: DETAILED
complexity: Medium
depends_on:
  - docs/STYLE.md
  - docs/STATUS.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex 권한 응답 UI

## 개요

Codex의 PermissionRequest hook을 받으면 패널 인라인에서 Yes/No 버튼을 노출하고, 클릭 시 `tmux send-keys`로 `y`/`n` 단일 글자를 codex에 전달한다. Claude의 `1\r`/`2\r` 패턴과 다르게 Enter 불필요 — codex default keymap이 단일 글자 즉시 처리.

## 주요 기능

### 1. PermissionRequest hook 수신 → UI 활성화

- `/api/status/hook?provider=codex` 핸들러가 `PermissionRequest` payload 수신
- `cliState='needs-input'` 전환 + `currentAction` 설정 ("권한 요청: <command/path>")
- 페인 타이틀에 `[ ! ] Action Required` 자동 (기존 메커니즘)
- 패널 자체에서도 강조 (visual cue: 파란 띠 + `permission-prompt-item` 깜박임)

### 2. Codex default keymap 매핑

`codex-rs/tui/src/keymap.rs:509-513` 검증 결과:

| 의도 | 키 |
| --- | --- |
| Approve (this turn) | `y` |
| Approve (whole session) | `a` |
| Approve (matching prefix) | `p` |
| Deny | `d` |
| Decline | `n` 또는 `Esc` |

Phase 2 매핑: **"Yes" → `y`, "No" → `n`** (default keymap 가정).

### 3. 응답 송신 — Enter 불필요

- `tmux send-keys <session> y` (또는 `n`) 단일 글자
- Claude의 `1\r`/`2\r`과 다름 — codex는 Enter 자동 처리
- send 실패 시 `toast.error('approval send failed')` + Yes/No 버튼 재활성화

### 4. 응답 실패 자동 감지 (E)

- `y`/`n` send 후 3초 timeout 시작
- 3초 내 `cliState`가 `needs-input` 외로 풀리지 않으면 토스트:
  - "응답이 codex에 닿지 않았습니다. keymap을 확인하세요"
- 변경 안 한 사용자엔 무관, keymap 변경한 사용자에게만 자연 fallback
- 사전 조건: codex가 user config(`~/.codex/config.toml`)로 approval keymap 노출하는 경우에만 적용
  - Phase 1 시작 전 `codex --help` / 공식 docs로 1줄 검증
  - 노출 안 함 → 이 조항 자체 삭제
  - 노출 함 → default `y`/`n` 가정 + 3초 timeout fallback 토스트
- 정식 동적 keymap 매핑은 예정 작업

### 5. UX 완성도

- **즉각적인 visual cue**: 패널 헤더에 빨간 점 + 페인 타이틀 깜박임 (250ms ease-in-out, 3회 반복)
- **인터랙션 피드백**:
  - 버튼 클릭 즉시 disabled 처리 + spinner ("응답 전송 중...")
  - 성공 시 "권한 부여됨" / "권한 거부됨" 토스트 + 버튼 fade-out
  - 실패 시 (E) 재시도 버튼 다시 활성화
- **터치 타겟 (모바일)**: `min-h-11` (44px) — Yes/No 버튼 + 간격 `gap-3`
- **키보드 접근성**: `y`/`n` 키로 직접 응답 가능 (입력 포커스가 패널일 때만)

### 6. 권한 요청 정보 표시

- request 종류 (`ExecApprovalRequest` / `ApplyPatchApprovalRequest` / `RequestPermissions`)별 아이콘/라벨
- 요청 대상:
  - ExecApproval: command + cwd
  - ApplyPatchApproval: 변경 파일 목록 + diff preview (collapsed)
  - RequestPermissions: 필요한 권한 종류
- 자세히 보기 토글 (default collapsed) — 긴 diff/command 노이즈 방지

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
| 2026-05-01 | 상세 문서 작성 (ui/flow/api) | DETAILED |
