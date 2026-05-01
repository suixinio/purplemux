# 화면 구성

> 본 feature는 server-side observer 통합으로 직접 UI는 없다. 마이그 결과 사용자에게 보이는 부수 효과만 정리.

## 1. 사용자에게 보이는 변화 — 거의 없음 (의도된 결과)

마이그가 잘 됐다면 사용자는 변화를 느끼면 안 됨:

- cliState 전환 정상 (Claude/Codex)
- timeline 갱신 정상
- 상태 인디케이터 정상

## 2. 잠재 개선 (체감 가능 영역)

| 영역 | 마이그 후 변화 |
| --- | --- |
| 상태 dispatch 지연 | hook → endpoint → helper → manager → observer 5 hop → hook → observer → manager 3 hop. 이론상 수 ms 빨라짐 (체감 미세) |
| 메모리 사용 | 중복 fs.watch 1개 제거 (Claude만 해당) — 시스템 리소스 ↓ |
| 로그 일관성 | 모든 work state 변경이 observer 단일 채널로 흐름 — `grep` 추적 쉬움 |

## 3. 디버그 패널 (옵션 — v19 외부 가능)

설정 → 디버그 → Observer 상태:

- provider별 observer 등록 여부 (Claude / Codex)
- 마지막 emit 시각 + 이벤트 종류
- subscribe 카운트 (status-manager 단일 등록 확인)
- jsonl tail 채널 vs hook 채널 비율

## 4. 빈 / 로딩 / 에러 상태 (영향 없음)

본 feature는 새 UI 영역을 추가하지 않음. 기존 빈/로딩/에러 상태 그대로 유지.

## 5. 회귀 검증 시각 항목

| 항목 | 검증 방법 |
| --- | --- |
| Claude 패널 헤더 인디케이터 | busy ↔ idle ↔ needs-input 정상 전환 |
| Claude timeline 자동 갱신 | 새 user/assistant message append 시 즉시 표시 |
| Codex 패널 동일 | 위 두 항목 모두 |
| 양쪽 동시 운영 | 한 탭의 cliState 변경이 다른 탭 영향 안 줌 |
| 30분 stress test | 메모리 누수 없음 (observer unsubscribe 정상) |
