---
step: build
timestamp: 2026-03-25 16:01
elapsed: 2분 40초
status: completed
---
구현 완료. 생성한 파일 3개:

| 파일 | 역할 |
|------|------|
| `src/types/message-history.ts` | 공유 타입 (`IHistoryEntry`, `IMessageHistoryFile`, 응답 타입) |
| `src/lib/message-history-store.ts` | 파일 기반 저장소 (per-workspace lock, atomic write, MRU 순서, 중복 제거, 500개 제한) |
| `src/pages/api/message-history.ts` | REST API 핸들러 (GET/POST/DELETE) |

주요 구현 사항:
- **per-workspace lock**: `Map<string, Promise<void>>`로 워크스페이스별 동시 쓰기 직렬화
- **atomic write**: `.tmp` 파일 작성 후 `rename`
- **MRU 순서**: 동일 메시지 재전송 시 기존 항목 제거 → 배열 앞에 삽입
- **500개 제한**: `entries.length = MAX_ENTRIES`로 초과분 자동 제거
- **경로 재사용**: `resolveLayoutDir(wsId)` → 워크스페이스 삭제 시 자동 정리
- **멱등 삭제**: 존재하지 않는 ID 삭제 시 `{ success: true }` 반환
- **슬래시 커맨드 필터링**: api.md 명세대로 클라이언트 책임 (서버는 그대로 저장)

---

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
