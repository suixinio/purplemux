---
page: codex-data-aggregation
title: Codex 세션 이력 + 통계 통합
route: (Notification Sheet + Stats 페이지)
status: DRAFT
complexity: High
depends_on:
  - docs/DATA-DIR.md
  - docs/STYLE.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex 세션 이력 + 통계 통합

## 개요

session-history(notification-sheet)와 stats(통계 페이지)를 두 provider 모두 흡수하도록 일반화한다. session-meta-cache 키를 `${providerId}:${sessionId}`로 분리해 UUID 충돌 회피, stats는 신규 aggregator 모듈로 두 jsonl-parser를 병렬 호출 + merge. Codex 전용으로 `rate_limits` 노출.

## 주요 기능

### 1. stats aggregator (옵션 B — 신규 모듈, 기존 무변경)

- **기존 `src/lib/stats/jsonl-parser.ts` (Claude 전용)**: 무변경 유지
- **신규 `src/lib/stats/jsonl-parser-codex.ts`**: `~/.codex/sessions/YYYY/MM/DD/` 스캔 + token 추출
- **신규 `src/lib/stats/stats-aggregator.ts`**: 두 parser 병렬 호출 + merge

```ts
export const aggregateStats = async (period) => {
  const [claudeStats, codexStats] = await Promise.all([
    parseClaudeJsonl(period), parseCodexJsonl(period),
  ]);
  return mergeStats(claudeStats, codexStats);
};
```

- 기존 호출 사이트는 aggregator 사용으로 마이그 (jsonl-parser.ts import 사이트만 변경)

### 2. token 합산 방식 차이 (parser 내부에서 흡수)

- **Claude**: 라인별 `usage.input_tokens` 합산
- **Codex**: jsonl 마지막 `token_count` event의 `total_token_usage` 채택 (이미 누적). 역방향 스캔 → 첫 hit

### 3. Codex 전용 추가 노출 — rate_limits 등

`event_msg.token_count.info`에서 추출:

- `rate_limits.primary.used_percent` — 현재 한도 사용률
- `model_context_window` — 모델 context window 크기
- `cached_input_tokens` — 캐시 입력 토큰
- `reasoning_output_tokens` — reasoning 출력 토큰
- 통합 차트(Claude 합산)와 함께 Codex 전용 섹션으로 노출

### 4. session-meta-cache 일반화 (옵션 A — key prefix)

- `src/lib/session-meta-cache.ts`의 `IMetaCache` 시그니처를 `(providerId, sessionId)` 받게 변경
- 내부 Map key는 `${providerId}:${sessionId}` 형식으로 결합 — 두 provider UUID 충돌 회피
- `ISessionMeta` 자체는 provider 무관 → 변경 불필요
- 호출 사이트(`session-list.ts` 등)에 providerId 인자 추가

### 5. session-history (notification-sheet) 일반화 (옵션 A — lazy 마이그)

- `ISessionHistoryEntry.claudeSessionId` → `agentSessionId: string | null` + `providerId: string` (default 'claude') 마이그
- 디스크 호환: `~/.purplemux/session-history.json` read 시 legacy `claudeSessionId` 발견하면 `{ agentSessionId: claudeSessionId, providerId: 'claude' }`로 lazy 변환. `claudeSessionId` 필드는 deprecated 마크
- `notification-sheet.tsx` (656줄):
  - `groupHistoryBySession` (line 144-148) key를 `${providerId}:${agentSessionId ?? entry.id}`로 변경
  - 그룹 렌더 시 providerId에 따라 `<ClaudeIcon>` 또는 `<OpenAIIcon>` 시각 구분
  - 토큰 정보는 단순 total로 통일 (provider별 세부 필드 차이는 stats 페이지에서만 노출)
- 신규 entry 작성 시 새 형식 사용 — legacy 필드 안 씀

### 6. session-history Codex 디렉토리 스캔

- `~/.codex/sessions/YYYY/MM/DD/` 일자 파티셔닝 디렉토리 스캔
- session-meta-cache 일반화와 함께 codex jsonl meta 추출
- 비용 가드: 최근 N일(기본 30일)만 스캔, 첫 줄만 read, meta-cache 활용

### 7. UX 완성도 — 토스급

- **빠르다**:
  - aggregator의 `Promise.all` 병렬 호출로 두 provider 합산 시간 = max(claude, codex)
  - 통계 페이지 prefetch (메뉴 hover 시 워밍)
  - notification-sheet 가상 스크롤 (이미 적용)
- **로딩/빈/에러 상태**:
  - 로딩: skeleton chart + entry placeholder
  - 빈: "이 기간에 세션이 없습니다"
  - 에러: 한 provider 실패해도 다른 provider 데이터는 표시 (graceful degradation)
- **인터랙션 피드백**:
  - 차트 hover: tooltip + 두 provider 분리 표시
  - notification-sheet 항목 클릭: 해당 세션 timeline 열기 (provider 자동 분기)
- **provider 시각 구분**:
  - 모든 곳에서 `<ClaudeIcon>` / `<OpenAIIcon>` 일관 사용
  - 차트 색상 구분 (Claude 보라계, Codex 청록계 — 기존 STYLE.md 팔레트 따름)

### 8. 회귀 검증 (수동)

- stats 페이지: Claude 단독 / Codex 단독 / 양쪽 합산 모두 정상
- Codex rate_limits 노출 (Claude는 해당 섹션 hidden)
- notification-sheet legacy entry (`claudeSessionId` only) 자연 마이그
- 패널 footer ContextRing — Codex 세션도 정상 (`reasoning_output_tokens` 포함)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
