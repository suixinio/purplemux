---
step: build
timestamp: 2026-03-20 03:23
elapsed: 10분 34초
status: completed
---
## 완료 요약

`v8/realtime-watch` 기능의 기존 구현을 스펙에 맞게 개선했습니다.

### 변경 파일

**`src/lib/timeline-server.ts`** — 핵심 개선
- **Race condition 수정**: 파일 파싱 완료 후에만 `fs.watch` 시작 (`startFileWatch`를 `createFileWatcher`에서 분리)
- **Offset 공유 버그 수정**: 동일 파일에 두 번째 클라이언트 구독 시 offset 덮어쓰기 방지 (새 watcher일 때만 설정)
- **Max connections 체크**: 30개 동시 연결 제한 (1013 코드로 거부)
- **Init 엔트리 제한**: 대용량 파일 초기 전송 시 최근 200개로 제한
- **세션 변경 브로드캐스트**: 동일 workspace의 **모든** 연결에 알림 (기존: 첫 번째 연결만)
- **sessionId 전달**: `detectActiveSession` 결과의 sessionId를 init 메시지에 포함
- **Watcher 에러 알림**: 재시도 초과 시 클라이언트에 `timeline:error` 전송
- **Graceful shutdown**: 파일 watcher 정리 추가

**`src/hooks/use-timeline-websocket.ts`** — reconnect 추가
- `connectTrigger` 상태로 수동 재연결 트리거 지원
- `reconnect()` 메서드 노출 → "다시 시도" 버튼 연동 가능

**`src/hooks/use-timeline.ts`** — retry 개선
- `retrySession`이 세션 정보 재조회 + WebSocket 재연결을 함께 수행

---

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
