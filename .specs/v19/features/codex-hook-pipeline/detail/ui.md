# 화면 구성

> Hook pipeline은 백엔드 인프라이며 직접 UI는 없다. 사용자에게 노출되는 영역만 정리.

## 1. 노출 지점

| 영역 | 표시 내용 | 트리거 |
| --- | --- | --- |
| 시스템 토스트 | "Codex hook 설치 실패. codex 상태가 정확하지 않을 수 있습니다." | 서버 부트 시 hook script write/chmod 실패 |
| 시스템 토스트 | "config.toml 파싱 실패, purplemux hook만 적용됨" | 첫 codex 탭 생성 시 (session storage dedupe) |
| 페인 타이틀 | `[ ! ] Action Required` | PermissionRequest hook 수신 |
| 패널 인디케이터 | busy ↔ idle ↔ needs-input 전환 | SessionStart/Stop/PermissionRequest hook |

## 2. 토스트 디자인

### B 케이스 (hook script 설치 실패)

- 위치: 우측 하단 (`sonner` 기본)
- 아이콘: `AlertTriangle` (warning)
- 색상: 노란 배경 + 짙은 노란 보더
- 자동 닫힘: 8초
- 액션: "확인" 버튼 (단순 dismiss)
- 키: `codexHookInstallFailed`

### C 케이스 (config.toml 파싱 실패)

- 위치: 우측 하단
- 아이콘: `Info` (info)
- 색상: 파란 배경
- 자동 닫힘: 6초
- 액션: "config.toml 열기" 버튼 (사용자 환경에서 `~/.codex/config.toml` 경로 클립보드 복사)
- 키: `codexConfigParseFailed`

## 3. 인디케이터 시각 트리트먼트

hook 이벤트가 cliState에 반영되는 패턴 (Claude와 동일 컴포넌트 재사용):

| hook event | cliState 변경 | 시각 변화 |
| --- | --- | --- |
| SessionStart (`source: clear`) | → `idle` (강제) + 메타 reset | 패널 timeline 클리어 + 헤더 점등 |
| UserPromptSubmit | → `busy` | 헤더 spinner + ContextRing 회전 |
| Stop | → `idle` | spinner 정지 + 색상 안정 |
| PermissionRequest | → `needs-input` | 파란 띠 + permission-prompt-item 활성화 (별도 feature) |

## 4. 디버그 표시 (개발자/지원 케이스)

설정 → 디버그 패널 (옵션, v19 외부 가능):

- 사용자 hook entry 개수 (머지 결과)
- 마지막 hook 수신 시각 + 이벤트 종류
- `~/.purplemux/codex-hook.sh` 권한 (0700 OK / 비정상 표시)

## 5. 빈 / 로딩 / 에러 상태

| 상태 | 표시 |
| --- | --- |
| 서버 부트 직후 hook script 작성 중 | 표시 안 함 (즉시 완료 — 수십 ms) |
| hook script 권한 비정상 | B 토스트 + `logger.error` |
| 사용자 config 파싱 실패 | C 토스트 + `logger.warn` |
| codex가 hook 호출 실패 (네트워크/토큰) | 서버 측 침묵 — codex 본체는 영향 없음 (병렬 + stdin 격리) |

## 6. 접근성

- 토스트는 `role="status"` (sonner 기본) — 스크린리더가 알림으로 인식
- "config.toml 열기" 버튼 keyboard accessible (`tabindex="0"`)
- 색상만으로 의미 전달 안 함 — 아이콘 + 텍스트 병기
