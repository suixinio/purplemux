---
step: verify-1
timestamp: 2026-03-20 11:27
elapsed: 4분 8초
status: patched
round: 1/3
---
보완이 완료되었습니다.

**변경 파일:** `src/pages/api/terminal.ts`

| 보완 항목 | 내용 |
|---|---|
| `process.on('exit')` 핸들러 추가 | SIGTERM/SIGINT 외에 `exit` 이벤트에도 gracefulShutdown 등록 — 좀비 프로세스 방지 |
| HTTP 응답 코드 복원 | 비-WebSocket GET 요청 `200` → `426 Upgrade Required` (스펙 일치) |

타입 체크, 린트 모두 통과. 전체 31개 항목 중 31개 구현 완료.

---

보완이 완료되었습니다.
재검증하려면 `/new` 후 `/5-verify`를 다시 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 검증을 수행합니다)
