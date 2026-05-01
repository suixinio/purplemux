# 화면 구성

## 1. Preflight 페이지 — Codex 섹션

### 레이아웃

기존 Preflight 페이지에 Claude 섹션과 동일 시각 트리트먼트로 Codex 섹션 추가.

```
┌─────────────────────────────────────────────────┐
│  Preflight                                      │
├─────────────────────────────────────────────────┤
│  [ClaudeIcon] Claude Code         [✓ installed] │
│    Path: /usr/local/bin/claude                  │
│    Version: 0.51.0                              │
│  ─────────────────────────────────────────────  │
│  [OpenAIIcon] Codex                [○ optional] │
│    Path: (미설치)              [Install 가이드] │
│    Version: —                                   │
└─────────────────────────────────────────────────┘
```

### 구성

| 요소 | 컴포넌트 | 비고 |
| --- | --- | --- |
| 아이콘 | `OpenAIIcon` (`size-6`) | Claude의 ClaudeIcon과 동일 크기 |
| 라벨 | "Codex" | `text-base font-medium` |
| 상태 배지 | `Badge` shadcn | `installed` 시 초록 + `✓`, 미설치 시 회색 + `○ optional` |
| Path | `text-sm text-muted-foreground` | 미설치 시 "(미설치)" 회색 |
| Version | `text-sm text-muted-foreground` | 미설치 시 "—" |
| Install 가이드 링크 | `Button variant="outline" size="sm"` | 미설치 시만 표시 |

### Install 가이드 링크 클릭 시

토스트 또는 작은 모달:

```
Codex CLI 설치 방법:

  npm i -g @openai/codex

또는

  brew install --cask codex

[명령어 복사] [공식 사이트 열기]
```

## 2. 메뉴 disabled 상태 (`pane-new-tab-menu`)

| 항목 | 상태 | 표시 |
| --- | --- | --- |
| "Codex 새 대화" | 미설치 | `disabled` + `text-muted-foreground` + 좌측 lock 아이콘 |
| "Codex 세션 목록" | 미설치 | 동일 |

### Tooltip

`disabled` 항목 hover 시:

```
Codex CLI가 설치되어 있지 않습니다
```

### 클릭 시 (실제로는 disabled라 click 발생 안 함, but tap에는 반응)

토스트:

```
Codex CLI를 설치하려면:
  npm i -g @openai/codex
또는 brew install --cask codex
```

## 3. 패널 빈 상태 (`agentInstalled: false`)

```
┌─────────────────────────────────────────────────┐
│  [OpenAIIcon · 회색]                            │
│                                                 │
│  Codex CLI가 설치되어 있지 않습니다             │
│  설치 후 다시 시도해 주세요                     │
│                                                 │
│  [Install 가이드 보기]                          │
└─────────────────────────────────────────────────┘
```

| 요소 | 스타일 |
| --- | --- |
| 아이콘 크기 | `size-12` |
| 메인 메시지 | `text-base font-medium` |
| 보조 메시지 | `text-sm text-muted-foreground` |
| 버튼 | `Button variant="default"` |

Claude `claudeInstalled: false` 패턴을 정확히 미러링.

## 4. 5개 에러 케이스 토스트

### A. 미설치 안내 토스트 (메뉴 클릭 시)

| 속성 | 값 |
| --- | --- |
| key | `codexNotInstalled` |
| 한국어 | `"Codex CLI를 설치하려면: npm i -g @openai/codex 또는 brew install --cask codex"` |
| 영문 | `"Install Codex CLI: npm i -g @openai/codex or brew install --cask codex"` |
| 아이콘 | `Info` |
| 자동 닫힘 | 6초 |
| 액션 | "명령어 복사" 버튼 |

### B. Hook script 설치 실패 (서버 부트 1회)

| 속성 | 값 |
| --- | --- |
| key | `codexHookInstallFailed` |
| 한국어 | `"Codex hook 설치 실패. codex 상태가 정확하지 않을 수 있습니다."` |
| 영문 | `"Codex hook installation failed. State detection may be inaccurate."` |
| 아이콘 | `AlertTriangle` |
| 자동 닫힘 | 8초 |
| 액션 | "확인" 버튼 |

### C. config.toml 파싱 실패 (first-use 1회)

| 속성 | 값 |
| --- | --- |
| key | `codexConfigParseFailed` |
| 한국어 | `"~/.codex/config.toml 파싱 실패. purplemux hook만 적용됩니다."` |
| 영문 | `"Failed to parse ~/.codex/config.toml. Only purplemux hooks applied."` |
| 아이콘 | `Info` |
| 자동 닫힘 | 6초 |
| 액션 | "config.toml 경로 복사" |
| dedup | session storage `codex-config-warned-once` |

### D. Runtime send-keys 실패

| 속성 | 값 |
| --- | --- |
| key | `codexLaunchFailed` / `codexResumeFailed` |
| 한국어 | `"Codex 실행 실패. 터미널을 확인해 주세요."` / `"Codex 세션 재개 실패."` |
| 영문 | `"Codex launch failed. Check the terminal."` / `"Codex resume failed."` |
| 아이콘 | `XCircle` |
| 자동 닫힘 | 6초 |
| 액션 | "재시도" 버튼 |

Claude `claude-code-panel.tsx:79-82` 토스트 메시지 키 미러.

### E. PermissionRequest 응답 send-keys 실패

| 속성 | 값 |
| --- | --- |
| key | `codexApprovalSendFailed` |
| 한국어 | `"권한 응답 전송 실패. 다시 시도해 주세요."` |
| 영문 | `"Failed to send approval response. Please try again."` |
| 아이콘 | `XCircle` |
| 자동 닫힘 | 8초 |
| 액션 | Yes/No 버튼 다시 활성화 |

추가 timeout fallback 토스트 (3초 내 cliState 풀리지 않으면):

| 속성 | 값 |
| --- | --- |
| key | `codexApprovalNotApplied` |
| 한국어 | `"응답이 codex에 닿지 않았습니다. keymap을 확인하세요."` |
| 영문 | `"Response did not reach codex. Check your keymap."` |
| 아이콘 | `AlertTriangle` |
| 자동 닫힘 | 10초 |
| 액션 | "재시도" |

## 5. 빈 / 로딩 / 에러 상태

| 영역 | 로딩 | 빈 | 에러 |
| --- | --- | --- | --- |
| Preflight 페이지 Codex 섹션 | skeleton (1줄) | N/A | "Preflight 실행 실패" + Retry 버튼 |
| 패널 (`agentInstalled: null`) | skeleton + "Codex 환경 확인 중..." | N/A | preflight 에러 토스트 |
| 패널 (`agentInstalled: false`) | N/A | 미설치 빈 상태 (위 3번) | N/A |

## 6. 인터랙션 피드백

| 액션 | 피드백 |
| --- | --- |
| 메뉴 항목 hover (disabled) | tooltip 즉시 표시 (`delay-100`) |
| Install 가이드 클릭 | 토스트 + 명령어 자동 복사 |
| 명령어 복사 버튼 | "복사됨" 토스트 (1초) |
| Restart 버튼 | spinner + 1초 후 boot indicator |
| 재시도 버튼 (D 토스트) | 즉시 토스트 dismiss + 새 launch 시도 |

## 7. 접근성

- Install 가이드 링크 keyboard accessible (`tabindex="0"`)
- 토스트 `aria-live="polite"` (sonner 기본)
- 빈 상태의 메인 메시지 `role="status"`
- 색상만으로 상태 전달 안 함 — 아이콘 + 라벨 병기

## 8. 반응형 / 모바일

- Preflight 페이지: 모바일에선 항목별 stack (Path/Version 줄바꿈)
- 토스트: 하단 fixed (mobile bottom sheet 스타일)
- 빈 상태: 가운데 정렬 + 패딩 `p-6`
