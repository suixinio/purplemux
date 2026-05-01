# Codex Provider — 두 번째 CLI Provider 도입

## 상태

- ✅ 1차 초안 (요구사항 정리)
- ✅ 모든 오픈 이슈 결정 (Hook 등록/페이로드, 시스템 프롬프트, Approval, 페인 타이틀, 프로세스 구조, State DB, Auto-resume)
- ✅ 셸 escaping/Hook 등록 축소/legacy 필드 정책/UUID 검증/Hook async 등 세부 결정
- ✅ Phase 1 (코어) + Phase 1.5 (UI 1급 시민화) 범위 분리
- ⏭️ 구현 진입 가능

## 작업 단계 요약

| Phase | 범위 | 결과물 |
| --- | --- | --- |
| **1** | Provider 코어 + hook 인프라 | Codex가 purplemux 안에서 동작 (terminal 모드). 상태 감지/auto-resume/시스템 프롬프트 ✓ |
| **1.5** | UI 1급 시민화 | Codex 메뉴/아이콘/단축키/패널/세션 목록/권한 응답. 사용자 UX 자연스러움 |
| **2** | 깊은 통합 | jsonl 파서 → 타임라인, session-meta-cache, session-history, stats, observer 정식 통합 |

## 배경

v18까지 purplemux는 Claude Code 한 종류의 코딩 CLI만 지원했다. 직전 작업으로 `IAgentProvider` 추상화를 도입해 신규 provider 추가 골격이 마련됐다. 이 문서는 그 첫 검증으로 **OpenAI Codex CLI**(`@openai/codex`)를 두 번째 provider로 붙이는 데 필요한 사실 정리와 매핑 초안이다.

참조 저장소: `~/Workspace/github.com/openai/codex`

## Codex CLI 핵심 사실

### 바이너리/설치
- 패키지: `@openai/codex` (npm) 또는 `brew install --cask codex`
- 실행 파일: `codex`
- 버전: `codex --version`
- 로그인: `codex login` (ChatGPT plan / API key / device code)

### 디렉토리 구조
```
~/.codex/
├── config.toml                    # 사용자 설정
├── AGENTS.md / AGENTS.override.md # 글로벌 시스템 프롬프트
├── auth.json                      # 인증 자격
├── sessions/
│   └── YYYY/MM/DD/
│       └── rollout-YYYY-MM-DDThh-mm-ss-{conversation-uuid}.jsonl
└── archived_sessions/             # 아카이브된 세션
```

`CODEX_HOME` 환경변수로 위치 변경 가능 (기본 `~/.codex`).

### 세션 ID
- UUID 형식 (`ThreadId`)
- 파일명: `rollout-{ISO-timestamp}-{uuid}.jsonl`
- Claude와 달리 cwd 기반 디렉토리가 아닌 **날짜 파티셔닝**

### Rollout(JSONL) 포맷
Claude의 평면 ResponseItem 시퀀스와 다르게 **태그 유니온**:
```jsonl
{"type":"session_meta","payload":{"id":"<uuid>","timestamp":"...","cwd":"...","originator":"codex_cli_rs","cli_version":"...","source":"cli",...}}
{"type":"response_item","payload":{...}}
{"type":"turn_context","payload":{...}}
{"type":"event_msg","payload":{...}}
{"type":"compacted","payload":{"message":"...","replacement_history":[...]}}
```

### 실행/Resume
| 동작 | 명령 |
| --- | --- |
| 새 세션(인터랙티브 TUI) | `codex [PROMPT]` |
| 비대화형 1회 실행 | `codex exec [PROMPT]` |
| 세션 ID로 resume | `codex resume <SESSION_ID>` |
| 가장 최근 세션 resume | `codex resume --last` |
| Fork(분기) | `codex fork <SESSION_ID>` |

### 주요 CLI 플래그
- `-m, --model` — 모델 지정
- `-a, --ask-for-approval <untrusted|on-failure|on-request|never>` — 명령 승인 정책
- `-s, --sandbox <mode>` — 샌드박스 정책
- `--dangerously-bypass-approvals-and-sandbox` (alias `--yolo`) — 모든 승인 우회
- `-C, --cd <DIR>` — 작업 디렉토리
- `--add-dir <DIR>` — 쓰기 가능한 추가 디렉토리
- `-i, --image <FILE>` — 이미지 첨부
- `-p, --profile <NAME>` — config.toml 프로필
- `--no-alt-screen` — alternate screen 비활성 (멀티플렉서 호환)
- `-c key=value` — config 오버라이드

### Hook 이벤트
`config.toml`의 `[hooks]` 테이블 + `~/.codex/hooks/*` 파일을 통해 등록.

| 이벤트 | 설명 | Claude 대응 |
| --- | --- | --- |
| `SessionStart` | 세션 시작 | session-start ✓ |
| `UserPromptSubmit` | 사용자 입력 제출 | prompt-submit ✓ |
| `PreToolUse` | 도구 호출 전 | (Claude도 동일) |
| `PermissionRequest` | 권한 요청 | notification (input-requesting) ≈ |
| `PostToolUse` | 도구 호출 후 | (Claude도 동일) |
| `Stop` | 턴 종료 | stop ✓ |

**없음(Claude 대비):** `Notification` (idle 알람), `PreCompact`/`PostCompact`(컴팩션 hook), `SubagentStop`, `Interrupt`

#### Hook 등록 — `-c hooks.<Event>=[...]` 인라인 주입

Claude의 `--settings <FILE>` 같은 별도 hook 파일 머지 플래그는 **없음**. 대신 `-c` config 오버라이드로 hooks 배열을 통째로 주입 가능.

**근거**: OpenAI 공식 `@openai/codex-sdk` (TS) — `sdk/typescript/src/exec.ts`의 `flattenConfigOverrides`가 정확히 이 패턴 사용:
- 객체는 평탄화 (`a.b.c=value`)
- **배열은 TOML inline으로 직렬화** (`hooks.SessionStart=[{matcher="...", hooks=[{type="command", command="..."}]}]`)

→ 메커니즘 검증 완료. SDK가 운영 중인 패턴.

**caveat — REPLACE 의미**: codex의 `-c` 오버라이드는 해당 키의 기존 값을 **덮어씀** (`apply_single_override`의 `tbl.insert(part, value)`). 사용자가 `~/.codex/config.toml`에 `[[hooks.SessionStart]]`를 등록해뒀다면 우리 `-c hooks.SessionStart=[...]`가 그것을 무효화.

→ Phase 1 정책: **매 launch 시 사용자 config 읽어 머지**. 사용자 hooks 보존 + 우리 entry 추가.

#### 외부 OSS 통합 사례 (참고)
- `codex-cli-hooks`, `code-notify`, `codex-notify` 등은 모두 **legacy `notify`**(turn-end만) 또는 **`~/.codex/config.toml` 직접 수정** 방식.
- VS Code/Cursor/Windsurf의 Codex IDE 확장은 **hooks를 안 씀**.
- `-c hooks.X=[...]` 런타임 주입을 쓰는 외부 도구는 (조사 시점 기준) 없음. 우리가 첫 사례.

→ purplemux는 SDK가 검증한 `-c` 패턴을 채택. 사용자 config 무수정 보장.

### Legacy notify
`config.toml`의 `notify = ["program", "args..."]` 설정 시, 매 턴 종료마다 다음 페이로드를 마지막 인자로 전달:
```json
{
  "type": "agent-turn-complete",
  "thread_id": "<uuid>",
  "turn_id": "<id>",
  "cwd": "<path>",
  "client": "codex-tui",
  "input_messages": ["..."],
  "last_assistant_message": "..."
}
```

### 시스템 프롬프트 주입 메커니즘
Claude의 `--append-system-prompt-file` 같은 직접적인 prompt-file 플래그는 **없지만**, `-c` config 오버라이드를 통해 **inline 문자열 주입이 가능**.

`config.toml`에 정식 등록된 필드 두 종:
| 필드 | 의미 | 적용 방식 |
| --- | --- | --- |
| `developer_instructions` | developer-role 메시지로 추가 삽입 | **append** (built-in 프롬프트 보존) |
| `model_instructions_file` | base_instructions 전체 교체 (파일 경로) | **replace** |
| `~/.codex/AGENTS.md` 또는 `{cwd}/AGENTS.{,override.}md` | user_instructions로 합쳐짐 | append (재귀 수집) |

→ **`-c developer_instructions="$(cat path/to/codex-prompt.md)"`** 한 줄로 주입 가능. 디스크에 새 파일 안 쓰고, 사용자 config.toml/AGENTS.md/auth.json 일체 보존.

## IAgentProvider 매핑 초안

`src/lib/providers/types.ts`의 인터페이스에 대해 codex provider가 채워야 할 슬롯:

| 슬롯 | Codex 구현 |
| --- | --- |
| `id` | `'codex'` |
| `displayName` | `'Codex CLI'` |
| `panelType` | `'codex-cli'` 또는 `'codex'` (TPanelType 유니언에 추가 필요) |
| `matchesProcess` | `commandName === 'codex'` (Claude는 `claude`/`node` 둘 다 — Codex는 Rust 바이너리라 `codex` 단일) |
| `isValidSessionId` | UUID regex (Claude와 동일) |
| `detectActiveSession` | `~/.codex/sessions/YYYY/MM/DD/rollout-*-{uuid}.jsonl` 스캔 + 자식 PID 매핑 |
| `isAgentRunning` | 자식 PID들 중 `ps -o args=`에 `codex` 포함 여부 |
| `watchSessions` | `~/.codex/sessions/` 일자 디렉토리 watch + PID poll |
| `buildLaunchCommand` | `codex` (+ workspace 컨텍스트 — 오픈 이슈) |
| `buildResumeCommand` | `codex resume <SESSION_ID>` |
| `parsePaneTitle` | Codex TUI 페인 타이틀 패턴 파악 필요 (별도 조사) |
| `sessionIdFromJsonlPath` | 파일명에서 마지막 UUID 추출 (`rollout-…-{uuid}.jsonl`) |
| `preflight` | `codex --version` + `~/.codex` 존재 + `~/.codex/auth.json` 로그인 확인 |
| `writeWorkspacePrompt?` | `~/.purplemux/workspaces/{wsId}/codex-prompt.md` 작성 (Claude의 prompt 파일과 짝). `buildLaunchCommand`가 이 경로 내용을 `-c developer_instructions`로 inline 전달 |
| `attachWorkStateObserver?` | Phase 2: hook 이벤트 변환 + jsonl tail 감시 |
| `read*/write*SessionId/JsonlPath/Summary` | `tab.agentState` (Step 1 추상)에 저장 |

### 신규 모듈 배치
```
src/lib/providers/codex/
├── index.ts                       # claudeProvider와 동형
├── session-detection.ts           # ~/.codex/sessions 스캔 (날짜 파티션)
├── preflight.ts                   # codex --version + auth 체크
├── client.ts                      # buildCodexLaunchCommand (브라우저용)
└── work-state-observer.ts         # hook 이벤트 → TAgentWorkStateEvent 변환
```

`process-utils.ts`(Step 2 분리)는 그대로 재사용.

### 차이점 정리

#### 1. 세션 파일 위치 발견 알고리즘
Claude는 `~/.claude/projects/<sanitized-cwd>/<session-uuid>.jsonl`. Codex는 `~/.codex/sessions/YYYY/MM/DD/rollout-*-<uuid>.jsonl`.

→ `provider.detectActiveSession`은 cwd 매칭이 아닌 **PID → SessionMeta(첫 줄) 매칭**으로 가야 함. 즉 sessions 디렉토리를 일자 역순으로 스캔하다 PID가 자식 PID 집합에 속하는 첫 파일을 찾는 식.

다른 접근: Codex의 `state_db`(SQLite)가 `~/.codex/{state.db}` 등에 살아있을 수 있음 — 활용 가능한지 확인 필요.

#### 2. JSONL 파서
Claude jsonl 파서(`session-parser.ts`, 1092줄)는 Claude 포맷 전용. Codex는:
- 첫 줄이 `{"type":"session_meta","payload":{...}}`
- 이후 `response_item / event_msg / turn_context / compacted` 태그 유니온

→ provider별 transcript parser 인터페이스가 필요. v18 작업 때 일부러 미루었던 영역. 본격적으로 연결할 때 설계.

**Phase 1**(이번 작업): jsonl 파싱은 미지원 — 타임라인 패널은 Codex 탭에 대해 비활성. 페인 표시(터미널)와 상태 감지(busy/idle)만 지원.

#### 3. 시스템 프롬프트 주입
**현재 상태**: Claude는 `--append-system-prompt-file ~/.purplemux/.../claude-prompt.md`로 워크스페이스 컨텍스트(workspaceId, CLI 사용법) 주입.

**Codex 결정**: `-c developer_instructions="<프롬프트 내용>"` 사용.

```bash
codex -c developer_instructions="$(cat ~/.purplemux/workspaces/{wsId}/codex-prompt.md)"
```

장점:
- 디스크에 새 파일 추가 안 함 (purplemux 디렉토리는 이미 prompt 파일 보유)
- 사용자 `~/.codex/config.toml`, `AGENTS.md`, `auth.json` 일체 미변경
- 매 실행마다 inline으로 전달 → 워크스페이스 컨텍스트 변경 시 즉시 반영
- `developer_instructions`는 append 의미 → 기본 시스템 프롬프트 보존

**제약**:
- 인자 길이: macOS/Linux ARG_MAX는 256KB+이라 워크스페이스 prompt(현재 ~2KB) 충분
- 셸 escaping: `$(cat ...)` 활용. `claude-prompt.md`처럼 별도 `codex-prompt.md` 생성 → 같은 빌더 패턴

**비교 — 다른 OSS CLI의 시스템 프롬프트 주입 방식**:

| 도구 | 방식 | 디스크 쓰기 | append/replace |
| --- | --- | --- | --- |
| Codex | `-c developer_instructions=...` (inline) | ❌ 없음 | append |
| Claude Code | `--append-system-prompt-file FILE` | 파일 필요 | append |
| Gemini CLI | `GEMINI_SYSTEM_MD=path` env | 파일 필요 | replace |
| Continue.dev | `--prompt` + config | 파일 필요 | append |
| Aider / Cursor / Crush | (없음) | repo 파일 필요 | — |

→ Codex가 OSS 통틀어 가장 깔끔. inline 문자열 주입 가능한 거의 유일한 도구.

`writeWorkspacePrompt?` 슬롯 구현: Claude처럼 워크스페이스 디렉토리에 `codex-prompt.md` 작성. `buildLaunchCommand`는 그 파일을 읽어 `-c developer_instructions=...`로 전달.

#### 4. Hook 이벤트 매핑
`TAgentWorkStateEvent` (Step 5에서 정의) ↔ Codex 이벤트:

| TAgentWorkStateEvent | Codex hook 이벤트 |
| --- | --- |
| `session-start` | `SessionStart` |
| `prompt-submit` | `UserPromptSubmit` |
| `notification` | `PermissionRequest` |
| `stop` | `Stop` |
| `interrupt` | (없음 — turn abort는 별도 시그널?) |
| `pre-compact` / `post-compact` | (없음 — Codex는 자체 compaction 메커니즘) |
| `summary-update` | jsonl tail에서 SessionMeta 변경 감지 |
| `last-user-message` | `UserPromptSubmit` 페이로드에서 |

→ `translateCodexHookEvent` 헬퍼는 위 매핑으로 작성. `interrupt`/`pre-compact`/`post-compact`는 Codex에서 발생할 일이 없음(또는 다른 방식) — observer가 emit 안 하면 되고, 표준 어휘는 그대로 둠.

#### 5. Hook 등록 방식
Claude는 `~/.claude/settings.json` + `--settings <FILE>` 머지 플래그 → 사용자 설정 보존이 자동.

Codex는 `--settings` 같은 플래그 없음. **`-c hooks.<Event>=[...]` 인라인 주입** 채택 (OpenAI 공식 SDK 패턴).

**Codex hook 페이로드 형식** (실측):
- 환경변수가 아니라 **stdin으로 JSON** 전달 (`codex-rs/hooks/src/engine/command_runner.rs`).
- 페이로드 공통 필드: `session_id`, `hook_event_name`, `transcript_path`, `cwd`, `model`, `permission_mode`
- 이벤트별 추가: `UserPromptSubmit`은 `turn_id`+`prompt`, `Stop`은 `turn_id`, `Pre/PostToolUse`는 `tool_name`+`tool_input`+...
- `transcript_path`가 직접 들어옴 → Claude처럼 PID 파일 스캔으로 jsonl 찾을 필요 없음

**구현 세부**:
1. **공용 Hook 스크립트** `~/.purplemux/codex-hook.sh` (서버 부트 시 한 번 작성, 인자 불필요)
   ```bash
   #!/bin/sh
   PORT_FILE="$HOME/.purplemux/port"
   TOKEN_FILE="$HOME/.purplemux/cli-token"
   [ -f "$PORT_FILE" ] || exit 0
   [ -f "$TOKEN_FILE" ] || exit 0
   PORT=$(cat "$PORT_FILE")
   TOKEN=$(cat "$TOKEN_FILE")
   TMUX_SESSION=$(tmux display-message -p '#{session_name}' 2>/dev/null || echo "")
   exec curl -s -o /dev/null -X POST \
     -H "x-pmux-token: $TOKEN" \
     -H "Content-Type: application/json" \
     --data-binary @- \
     "http://localhost:$PORT/api/status/hook?provider=codex&tmuxSession=$TMUX_SESSION" 2>/dev/null
   ```
   - stdin을 endpoint로 그대로 forward (`@-`)
   - **tmux session name은 query string에 추가** (codex 페이로드에는 없으므로 — Claude의 `tmux display-message` 패턴과 동일)
   - 토큰 헤더는 Claude와 동일 `x-pmux-token` 사용 (서버 인증 통일)
   - 토큰/포트는 파일에서 읽음 → 명령줄 노출 회피
   - 파일 권한 0700 (실행 + 읽기 own only)

2. **사용자 config 머지 로직**:
   - 매 launch 직전 `~/.codex/config.toml` 파싱 (Node-side, `smol-toml` 추가)
   - 4개 이벤트 각각 우리 entry + 사용자 entry 합친 배열 생성. **순서**: `[...ourEntries, ...userEntries]` — 우리 hook이 먼저, 사용자 hook이 다음. async=true라 codex 본체 진행에 영향 없음. 사용자 hook이 stdin 소비/타임아웃해도 우리쪽 안전.
   - `-c hooks.SessionStart=[...]` 형태로 4번 인자 추가
   - 사용자 config 누락 시(파일 없거나 hooks 섹션 없음) 우리 entry만
   - **파싱 실패 graceful**:
     ```ts
     let userHooks: any = {};
     try {
       const raw = await fs.readFile(USER_CODEX_CONFIG, 'utf-8').catch(() => '');
       userHooks = raw ? (smolToml.parse(raw)?.hooks ?? {}) : {};
     } catch (err) {
       log.warn('failed to parse ~/.codex/config.toml, using our hooks only: %s', err);
     }
     ```

3. **TOML 직렬화** — TS SDK의 `toTomlValue` 패턴 그대로:
   ```
   JS 객체 → toTomlValue() → TOML inline string → shellQuote() → shell arg
   ```
   - 문자열: `JSON.stringify(s)` — TOML basic string과 호환 (`"`, `\`, `\n`, `\u00XX` 모두 정상 처리)
   - 객체: `{key = value, ...}` inline table
   - 배열: `[item, ...]` inline array
   - 사용자 hook command에 임의 문자 포함되어도 JSON.stringify 한 번으로 안전

   **developer_instructions만 다른 처리**: triple-quoted literal `'''...'''` 사용 (raw 텍스트, 우리 prompt 내용에 `'''` 없게 sanitize). hooks와는 다른 escape 정책.

   `src/lib/providers/codex/hook-config.ts`로 캡슐화.


4. **서버 endpoint 분기**:
   - 동일 path `/api/status/hook` (POST) + `?provider=claude|codex&tmuxSession=...` query
   - 인증: 둘 다 `x-pmux-token` 헤더
   - body 분기:
     - `provider=claude` (또는 미지정 — 기존 호환): `{ event, session, notificationType }` 형식
     - `provider=codex`: codex 원본 stdin JSON (`{ session_id, hook_event_name, transcript_path, cwd, ... }`)
     - `tmuxSession` query에서 어느 탭인지 매칭 (`findTabIdBySession`)
   - codex 어댑터: payload → `translateCodexHookEvent(payload.hook_event_name, payload)` → 표준 `TAgentWorkStateEvent` → status-manager dispatch
   - **Step 5에서 만든 observer 슬롯의 첫 사용자**

5. **Hook 페이로드 → ITabStatusEntry 갱신 매핑** (codex 어댑터에서 `updateTabFromHook` 호출 직전 처리):
   - `transcript_path` → `entry.jsonlPath` 갱신 (null guard: 값 있을 때만). Claude의 PID 파일 스캔 대체.
   - `session_id` (모든 hook 공통) → `entry.agentSessionId` 갱신. 처음 등록뿐 아니라 **`/clear` 시점의 SessionStart**(`source=clear`)도 새 session_id로 자동 갈아끼움.
   - `prompt` (UserPromptSubmit only) → `entry.lastUserMessage` + `entry.agentSummary` 갱신 (페인 타이틀 대체).
   - `model` → 향후 stats 활용 (Phase 2).
   - 이후 표준 `updateTabFromHook(tmuxSession, eventName, ...)` 호출 → cliState 전환.

   ```ts
   // 의사 코드: /api/status/hook?provider=codex 핸들러
   const tabId = findTabIdBySession(tmuxSession);
   const entry = getEntry(tabId);
   if (!entry) return;

   // 1. agent 메타데이터 갱신 (모든 hook 공통)
   entry.agentProviderId = 'codex';
   entry.agentSessionId = payload.session_id;  // 모든 SessionStart에서 갱신 (clear 케이스 자동 처리)
   if (payload.transcript_path) {
     entry.jsonlPath = payload.transcript_path;  // null guard
   }
   if (payload.hook_event_name === 'UserPromptSubmit' && payload.prompt) {
     entry.lastUserMessage = payload.prompt;
     entry.agentSummary = payload.prompt.slice(0, 80);  // 적절히 truncate
   }

   // 2. cliState 전환 — codex 동시성 보정
   const eventName = translateCodexHookEvent(payload);

   if (eventName === 'session-start') {
     // codex는 SessionStart를 turn 시작 시점에 발사 → UserPromptSubmit과 거의 동시.
     // hook async라 도착 순서 비결정 → SessionStart가 UserPromptSubmit보다 늦게 오면 busy→idle 회귀.
     // 보정: cliState='inactive' 또는 'unknown'일 때만 idle 전환 적용. 이미 의미있는 상태면 skip.
     if (entry.cliState === 'inactive' || entry.cliState === 'unknown') {
       statusManager.updateTabFromHook(tmuxSession, 'session-start', undefined);
     }
     return;
   }

   // prompt-submit/stop/notification은 정상 순서 보장 — 그대로 dispatch
   if (eventName) {
     statusManager.updateTabFromHook(tmuxSession, eventName, /* notificationType */ undefined);
   }
   ```

   **이 동시성 보정은 codex 어댑터에만 적용**. Claude는 SessionStart가 시작 시점에 한 번만 발사 + UserPromptSubmit과 시간 차 충분 → 영향 없음.

→ `ensureCodexHookScript()` 부트스트랩(스크립트 작성) + `buildCodexHookOverrides(userConfigToml)` 헬퍼 필요.

#### 6. CLI 통합 — `purplemux` 명령
현재 `bin/purplemux.js`는 Claude 세션 관리에 종속되지 않은 CLI라 큰 변경 없음. 다만 `purplemux api-guide` 출력의 panelType 목록에 `codex-cli` 추가 필요.

#### 7. UI/단축키 (이번 단계 범위 밖)
사용자가 "5번(UI 등록)은 일단 제외"라고 했으니 UI 신규 패널/아이콘/단축키는 스킵. 다만 panelType union에 codex 값을 추가하면 기존 `panelType === 'claude-code'` 분기 코드가 codex 탭에 대해 모두 false 떨어짐 → 동작 안 함이 아니라 **terminal 탭처럼 폴백**. 의도한 동작.

## Phase 1 범위 (이번 작업으로 끝낼 것)

1. `TPanelType` 유니언에 `'codex-cli'` 추가
2. `src/lib/providers/codex/` 디렉토리 + 7개 파일:
   - `index.ts` — `IAgentProvider` 구현
   - `session-detection.ts` — `~/.codex/sessions/YYYY/MM/DD/` 스캔
   - `preflight.ts` — `codex --version` + `~/.codex/auth.json` 체크
   - `client.ts` — 브라우저용 `buildCodexLaunchCommand`
   - `work-state-observer.ts` — hook 이벤트 변환 (`translateCodexHookEvent`)
   - `prompt.ts` — `writeCodexPromptFile`(워크스페이스 prompt md 작성) + `getCodexPromptPath`
   - `hook-config.ts` — 사용자 `~/.codex/config.toml` 파싱 + 우리 hook entry 머지 + `-c hooks.<E>=[...]` 인자 배열 생성
3. `claudeProvider`와 동형으로 `IAgentProvider` 슬롯 채우기 (transcript 파서 제외)
   - `writeWorkspacePrompt`: `writeCodexPromptFile` 위임
   - `buildLaunchCommand`: `-c developer_instructions="$(cat <path>)"` 형태로 prompt inline 주입
   - `buildResumeCommand`: `codex resume <SESSION_ID> -c developer_instructions=...`
4. `workspace-store.ts`의 `writeAllWorkspacePrompts`가 codex provider도 호출하게 됨 (이미 provider iteration 패턴 적용됨 — 자동)
5. `providers/index.ts`에서 codex provider 등록 (`registerProvider(codexProvider)`)
6. `ensureCodexHookScript()` 구현 → 서버 부트 시 `~/.purplemux/codex-hook.sh` 작성. (Claude의 `ensureHookSettings`와 짝)
7. TOML 파서 의존성 추가 (`smol-toml` 또는 `@iarna/toml`) — 사용자 config 머지에만 사용
8. `cli/api-guide.ts` 응답에 `codex-cli` 추가
9. `process-icon.ts`의 명시적 리스트는 이미 `'claude', 'codex'` 포함 — 확인만

## Phase 1.5 (UI 1급 시민화)

Codex 탭이 사용자 입장에서 자연스럽게 보이게 하는 최소 UI 작업. jsonl 파서/타임라인은 Phase 2 유지.

### 신규 컴포넌트/모듈
1. ~~신규 아이콘 파일~~ — 기존 `src/components/icons/openai-icon.tsx`(이미 존재) 재사용. Codex 탭 표시에 `OpenAIIcon` 사용. 상태 인디케이터는 Claude와 동일한 원형 (cliState 기반 색상 — `tab-status-indicator.tsx` 기존 로직 그대로).
2. `src/components/features/workspace/codex-panel.tsx`
   - **ClaudeCodePanel 거의 그대로 복사 + 차이점만 변경** (옵션 A 채택). 코드 중복은 Phase 2에서 일반화 시 제거.
   - 차이점:
     - 헤더 아이콘: `CodexIcon`
     - "timeline" view → **placeholder** (`<Empty>` 또는 단순 메시지: "Codex 타임라인 준비 중. 아래 터미널에서 직접 작업하세요.")
     - "session-list" view: codex 디렉토리(`~/.codex/sessions/YYYY/MM/DD/`) 스캔 결과 표시 (`session-list.ts` 모듈 활용)
     - "check" view: 세션 시작 중... 메시지 (Claude와 동일 흐름)
   - `WebInputBar` 재사용 (입력 → terminal로 send-keys, Codex도 동일 UX)
   - 세션 ID 표시 (footer 등 디버깅용)
3. `src/components/features/mobile/mobile-codex-panel.tsx` — 모바일 짝
4. `src/lib/providers/codex/session-list.ts` — `~/.codex/sessions/YYYY/MM/DD/*.jsonl` 스캔 + 첫 줄 SessionMeta 추출 (Phase 2 jsonl 파서 없이도 메타만 파싱)
   - **옵션 A 채택**: Claude session-list와 별도 모듈/컴포넌트. UI 재사용 없이 각자 자기 데이터 형식. Phase 2에서 `ISessionListEntry` 일반화 시점에 통합.
   - export 시그니처:
     ```ts
     export interface ICodexSessionListEntry {
       sessionId: string;
       jsonlPath: string;
       cwd: string;
       startedAt: number;
       firstUserMessage?: string | null;  // 첫 RolloutItem이 user message면 추출
     }
     export const listCodexSessions: (opts?: { cwd?: string }) => Promise<ICodexSessionListEntry[]>;
     ```
   - cwd 필터 옵션 — 현재 워크스페이스 기준으로 그 cwd에서 시작된 세션만 보여주기 (Claude의 cwd 필터와 유사 UX)

### 기존 분기 추가
5. `src/lib/keyboard-shortcuts.ts` — `view.mode_codex` 액션 = **`Cmd+Shift+X`** (Mac) / `Ctrl+Shift+X` (기타). codeX의 X 연상.

   **모드 전환 잠금 규칙** — `use-keyboard-shortcuts.ts`의 `switchMode(target)` 갱신:
   ```ts
   const switchMode = (target: TPanelType) => {
     const current = tab.panelType;
     const isAgentRunning = tab.cliState !== 'inactive' && tab.cliState !== 'unknown';
     const currentIsAgent = current === 'claude-code' || current === 'codex-cli';
     const targetIsAgent = target === 'claude-code' || target === 'codex-cli';

     // agent 실행 중 + 다른 agent로 전환 시도 → 차단
     if (isAgentRunning && currentIsAgent && targetIsAgent && target !== current) {
       toast.error(t('switchAgentBlocked'));  // "현재 실행 중인 CLI를 먼저 종료하세요"
       return;
     }
     updateTabPanelType(paneId, tabId, target);
   };
   ```

   요약:
   - agent 실행 중: claude↔codex 전환 차단 (토스트 안내)
   - terminal/diff/web-browser 전환은 항상 허용 (display 변경만, CLI 안 죽임)
   - 같은 panelType: no-op
   - 종료 상태: 모두 허용

   **panelType 전환 시 `agentState` 처리** (`use-layout.ts:updateTabPanelType` 갱신):
   | 전환 | agentState 처리 |
   | --- | --- |
   | `*` → `terminal` | `agentState = undefined` (기존, 유지) |
   | `claude-code` → `codex-cli` | `agentState = undefined` (잠금 통과 시 = 종료 상태) |
   | `codex-cli` → `claude-code` | `agentState = undefined` |
   | `terminal` → 임의 agent | undefined 유지 (새 세션 시작) |
6. `src/components/features/workspace/pane-new-tab-menu.tsx` — Codex 메뉴 항목 (Claude 패턴 복사):
   - "Codex 새 대화" → `buildCodexLaunchCommand({ workspaceId })`
   - "Codex 세션 목록" → session-list 화면
7. `src/components/features/workspace/pane-container.tsx` — `panelType === 'codex-cli'` 분기, `CodexPanel` 렌더
8. `src/components/features/mobile/mobile-surface-view.tsx` — 모바일 짝
9. `src/components/features/mobile/mobile-terminal-page.tsx` — Codex 새 세션 핸들러 (`buildCodexLaunchCommand`)
10. `src/components/features/workspace/workspace-status-indicator.tsx` — `'codex-cli'` 케이스 추가
11. `src/components/features/workspace/tab-status-indicator.tsx` — `'codex-cli'` 케이스 (Claude처럼 cliState 표시)
12. `src/components/features/mobile/mobile-navigation-sheet.tsx` — codex 서머리 표시 (Step 4에서 `agentSummary`로 일반화됨)

### Hook 응답 처리
13. **PermissionRequest 응답 흐름** — 사용자가 UI에서 Yes/No 클릭 시 send-keys로 codex 응답.
    - **Codex default approval keys** (`codex-rs/tui/src/keymap.rs:509-513` 확인):
      - `y` — approve (단일 호출)
      - `a` — approve for session
      - `p` — approve for prefix
      - `d` — deny (저장)
      - `n` 또는 `Esc` — decline (이번만)
    - 단일 글자라 엔터 불필요 (Claude의 `1\r` 패턴과 다름).
    - Phase 1.5 매핑:
      - "Yes" → `y`
      - "No" → `n`
    - Phase 2에서 추가 옵션(`a`/`p`) UI 노출.
    - **caveat**: 사용자가 keymap 커스터마이즈한 경우(`~/.codex/config.toml`의 `[keymap.approval]` 변경) default 키가 다름. Phase 1.5는 default만 가정. 사용자 keymap 읽어 매핑은 Phase 2.

### 신규 i18n 키
- `codexNewConversation` ("Codex 새 대화" / "New Codex conversation")
- `codexSessionList` ("Codex 세션" / "Codex sessions")
- `codexTimelineComingSoon` ("Codex 타임라인 준비 중" / "Codex timeline coming soon")
- `switchAgentBlocked` ("현재 실행 중인 CLI를 먼저 종료하세요" / "Exit the running CLI first to switch agents")
- `codexNotInstalled` ("Codex CLI가 설치되지 않았습니다" / "Codex CLI is not installed")

### Phase 1.5 후 작동
- ✅ Codex 탭 생성 UI (메뉴/단축키)
- ✅ Codex 아이콘으로 탭 식별
- ✅ Codex 패널 (placeholder 타임라인, 세션 정보)
- ✅ 세션 목록 (디스크 스캔)
- ✅ 권한 요청 응답 UI
- ✅ 워크스페이스 인디케이터에 codex 상태 반영

### Phase 1.5에 안 함 (Phase 2)
- jsonl 파싱 → 풀 타임라인
- session-meta-cache codex 통합
- session-history (notification-sheet) codex 지원 — 일단 Claude 세션만 표시
- stats 페이지 codex 토큰
- PreToolUse/PostToolUse → currentAction 추적
- `attachWorkStateObserver` 정식 통합 (Step 5의 TODO 해소)

## Phase 2 (별도 spec 작성 후 진행)

각 항목이 자체로 큰 작업이라 **본 문서가 아닌 별도 spec**(`.specs/vXX/requirements/codex-phase2.md`)에서 상세 설계. Phase 1/1.5 종료 후 jsonl 포맷 실측한 뒤 작성.

항목 (개략):
- **jsonl transcript 파서** — `RolloutItem` 태그 유니온 → `ITimelineEntry` 매핑. `session-parser.ts` 일반화 또는 codex 전용 분리. 가장 큰 작업 (~800-1000줄).
- **타임라인 패널** — `CodexPanel`의 placeholder 제거 + 실 timeline 연결.
- **session-meta-cache** — Codex 메타 캐시. Claude의 `session-meta-cache.ts` 패턴 적용.
- **session-history (notification-sheet)** — `claudeSessionId` 기반 식별을 `agentSessionId + providerId`로 일반화. 두 provider 세션 모두 표시.
- **stats 페이지** — `claude-tokens.ts` 일반화 + Codex 토큰 추적 (jsonl `event_msg`/`response_item`에서 usage 파싱).
- **PreToolUse/PostToolUse hook 활용** — currentAction 갱신 (Phase 1.5에서는 미등록).
- **`attachWorkStateObserver` 정식 통합** — Step 5의 TODO 해소. status-manager가 provider observer를 직접 구독하는 흐름.
- **`AgentPanel` 일반화** — Phase 1.5의 ClaudeCodePanel/CodexPanel 코드 중복 제거.
- **`ISessionListEntry` 일반화** — Phase 1.5의 별도 session-list 모듈 통합.
- **사용자 keymap 인지** — 사용자가 `~/.codex/config.toml`의 `[keymap.approval]` 변경한 경우 권한 응답 키 매핑 동적 처리.

## 구현 전 마지막 검토 항목

### 결정된 인터페이스 변경 (Phase 1 작업에 포함)

#### `IAgentProvider.matchesProcess` 시그니처 확장
```ts
// 기존
matchesProcess(commandName: string): boolean;
// 변경
matchesProcess(commandName: string, args?: string): boolean;
```
- `getProviderByProcessName(commandName, args?)`도 동일하게 확장
- 호출 사이트 (그렙 후 모두 args 전달):
  - `src/lib/auto-resume.ts:62` (`sendResumeKeys`에서 `getProcessArgs(pid)` 결과 같이 전달)
  - 기타 process-icon 등은 commandName만 있어도 OK (`args` 옵션이라 호환)

#### 새 파일별 export 시그니처
```ts
// providers/codex/index.ts
export const codexProvider: IAgentProvider;

// providers/codex/session-detection.ts
export const detectActiveSession: (panePid: number, childPids?: number[]) => Promise<ISessionInfo>;
export const isCodexRunning: (panePid: number, childPids?: number[]) => Promise<boolean>;
export const watchSessionsDir: (panePid: number, onChange: (info: ISessionInfo) => void, options?: { skipInitial?: boolean }) => ISessionWatcher;

// providers/codex/preflight.ts
export const runCodexPreflight: () => Promise<IAgentPreflight>;

// providers/codex/client.ts
interface IBuildCodexLaunchCommandOptions {
  workspaceId?: string | null;
  dangerouslySkipPermissions?: boolean;
  resumeSessionId?: string | null;
  hookOverrides?: string[];  // -c hooks.X=[...] 인자들 (서버에서 사전 빌드)
}
export const buildCodexLaunchCommand: (opts: IBuildCodexLaunchCommandOptions) => string;

// providers/codex/work-state-observer.ts
interface ICodexHookPayload {
  session_id: string;
  hook_event_name: string;
  transcript_path: string | null;
  cwd: string;
  model?: string;
  permission_mode?: string;
  source?: string;            // SessionStart only
  turn_id?: string;           // UserPromptSubmit/Stop/Pre/PostToolUse
  prompt?: string;            // UserPromptSubmit
  // ... 이벤트별 추가 필드
}
export const translateCodexHookEvent: (payload: ICodexHookPayload) => TAgentWorkStateEvent | null;

// providers/codex/prompt.ts
export const writeCodexPromptFile: (ws: IWorkspace) => Promise<void>;
export const getCodexPromptPath: (wsId: string) => string;

// providers/codex/hook-config.ts
/** 서버 부트 시 한 번 호출 — ~/.purplemux/codex-hook.sh 작성 (mode 0700)
 *  호출 위치: server.ts에서 ensureHookSettings(result.port) 다음 줄.
 *  Claude 패턴과 동일하게 내용 동일성 비교 후 변경 시에만 갱신. */
export const ensureCodexHookScript: () => Promise<void>;
/** 매 launch 직전 호출 — 사용자 ~/.codex/config.toml 머지 + -c hooks.X=[...] 인자 배열 반환 */
export const buildCodexHookOverrides: () => Promise<string[]>;
```

#### 서버 endpoint 명세 (`/api/status/hook`)
- POST, `x-pmux-token` 헤더 인증
- Query: `?provider=claude|codex&tmuxSession=<name>`
- Body:
  - claude: `{ event: string, session: string, notificationType?: string }`
  - codex: 원본 stdin JSON (위 ICodexHookPayload)
- 어댑터 분기 후 status-manager 호출

#### `parsePaneTitle` 정규식 (Codex)
```ts
const SPINNER_RE = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;
const ACTION_REQUIRED_RE = /\[\s*[!.]\s*\]\s*Action Required/;
// summary 추출 안 함 — 항상 null. 보조 신호는 status-manager 측에서 별도 추출
```

### 셸 Escaping 정책 (중요)
`-c developer_instructions=...` / `-c hooks.X=[...]`의 값이 tmux send-keys → 사용자 셸 → codex argv 경로로 전달됨. 내용에 따옴표/`$`/줄바꿈 포함되니 안전한 quoting 필요.

**TOML 측**: triple-literal 사용
```toml
developer_instructions = '''<content>'''
```
- 이스케이프 없음, `'''`만 금지
- write 시 prompt 내용에 `'''` 들어가지 않게 sanitize (예: `'''` → `' ''`)

**셸 측**: 단일따옴표 wrap + 임베드 `'` 이스케이프 (`'\''` 패턴)
```ts
const shellQuote = (s: string): string =>
  `'${s.replace(/'/g, "'\\''")}'`;

const tomlValue = `'''${sanitizeForTomlLiteral(promptContent)}'''`;
const arg = `developer_instructions=${tomlValue}`;
parts.push('-c', shellQuote(arg));
```

`hooks.X=[...]` 인자도 동일 패턴: TOML inline 직렬화(SDK의 `toTomlValue`) → 결과 문자열을 shellQuote.

### Hook 등록 이벤트 축소
초기 명세는 6개 이벤트(SessionStart/UserPromptSubmit/PreToolUse/PermissionRequest/PostToolUse/Stop) 등록이었으나, **PreToolUse/PostToolUse는 매 도구 호출마다 hook 발사 → 불필요한 트래픽**. cliState 결정에 안 쓰임.

→ Phase 1은 **4개만 등록**: `SessionStart`, `UserPromptSubmit`, `Stop`, `PermissionRequest`.

PreToolUse/PostToolUse는 Phase 2에서 currentAction 추적이 필요할 때 추가.

`buildCodexHookOverrides`도 4개 인자만 반환:
```ts
const events = ['SessionStart', 'UserPromptSubmit', 'Stop', 'PermissionRequest'] as const;
```

### ITab Legacy 필드 정책
Claude는 v18 이전 데이터 호환을 위해 `claudeSessionId/JsonlPath/Summary` legacy 필드 + `agentState` 신 필드 dual-write 유지.

**Codex는 새 provider라 legacy 데이터 없음** → `agentState`만 사용. ITab에 `codexSessionId` 같은 필드 추가하지 않음.

```ts
// providers/codex/index.ts (단순화)
const PROVIDER_ID = 'codex';
readSessionId: (tab) =>
  tab.agentState?.providerId === PROVIDER_ID ? tab.agentState.sessionId : null;
writeSessionId: (tab, sessionId) => {
  tab.agentState = {
    providerId: PROVIDER_ID,
    sessionId: sessionId ?? null,
    jsonlPath: tab.agentState?.jsonlPath ?? null,
    summary: tab.agentState?.summary ?? null,
  };
};
// LEGACY_KEY 매핑/dual-write 없음
```

### `isValidSessionId`
Codex ThreadId = UUID (`Uuid::now_v7()`로 생성, `Uuid::parse_str()`이 표준 UUID 모두 수용). Claude와 동일 regex 재사용.

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
isValidSessionId: (id): id is string =>
  typeof id === 'string' && UUID_RE.test(id);
```

### Hook 명령 옵션
`{ type: "command", command: "<path>/codex-hook.sh", async: true }`:
- `async: true` — fire-and-forget. 우리 endpoint 응답이 느려도 codex 진행 막지 않음
- `timeout: 3` (초) — 안전망

### Preflight 결과 노출
**옵션 A 채택** — `IPreflightResult`에 `codex` 필드 추가:
```ts
interface IPreflightResult {
  tmux: ...; git: ...;
  claude: IAgentPreflight;
  codex: IAgentPreflight;  // ← Phase 1 추가
  brew?: ...; clt?: ...;
}
```
- 단순. 기존 UI 분기 유지하면서 codex 영역만 추가.
- 일반화(`agents: Record<string, IAgentPreflight>`)는 3번째 provider 추가 시점에 리팩터.

**`isRuntimeOk` 갱신**: Codex는 **optional**. Codex 미설치라도 `isRuntimeOk = tmux ✓ + git ✓ + claude ✓ ` 통과. UI에서 codex 영역만 "설치 안 됨" 표시.

```ts
export const isRuntimeOk = (status: IRuntimePreflightResult): boolean =>
  status.tmux.installed && status.tmux.compatible
    && status.git.installed
    && status.claude.installed;
  // codex는 체크 안 함 — optional
```

### Codex 미설치 환경 격리
Codex가 optional이므로 미설치 환경에서도 purplemux 정상 동작 + Codex 관련 시도가 사용자에게 혼란 주지 않게:

1. **Provider 등록은 unconditional** — `registerProvider(codexProvider)` 항상 호출. 등록 자체는 안전, 사용 시점에 graceful.
2. **Hook config 머지** — `buildCodexHookOverrides()`가 `~/.codex/config.toml` 없으면 우리 entry만 (이미 명시).
3. **UI 메뉴 (Phase 1.5) — preflight 결과 따라 disabled**:
   - `pane-new-tab-menu.tsx`의 "Codex 새 대화"/"Codex 세션 목록"이 `preflight.codex.installed === false`면 grayed out + tooltip "Codex CLI not installed. Run `brew install --cask codex` or `npm i -g @openai/codex`".
   - 권장: `useRuntimePreflight()` 훅 결과로 `codex.installed` 체크.
4. **Auto-resume skip**:
   - `auto-resume.ts`에서 codex provider 사용 탭 발견 시 launch 전 `provider.preflight()` 또는 cached preflight로 `installed` 확인.
   - 미설치면 해당 탭 skip + `log.warn('codex not installed, skipping auto-resume for tab %s', target.tabId)`.
   - Claude 탭은 영향 없이 정상 진행.
5. **Status detection은 자동 graceful** — `detectActiveSession`이 `~/.codex` 없음 감지 → `status: 'not-installed'`로 반환 (Claude의 `isClaudeInstalled` 체크 패턴 동일).

### 보안/생명주기 체크리스트
- [ ] `~/.purplemux/codex-hook.sh` 권한 0700 (실행 own only)
- [ ] `~/.purplemux/cli-token` 권한 0600 (이미 충족 가정 — 검증 필요)
- [ ] `/api/status/hook` localhost 전용 바인딩 (이미 충족 가정 — 검증 필요)
- [ ] 사용자 `~/.codex/config.toml` 파싱 실패 시 우리 entry만 적용 (graceful degrade)
- [ ] 사용자 config가 없을 때(`~/.codex/` 미존재) preflight에서 `not-installed` 또는 `not-initialized`

### Codex-specific 동작 차이 (구현 디테일)

#### A. SessionStart hook 발사 시점
**확인됨**: `codex-rs/core/src/session/turn.rs:299` — `run_pending_session_start_hooks`는 **첫 turn 실행 시점**에 호출. 즉 사용자가 첫 메시지를 입력한 후에야 발사 (session 생성 시 큐잉만).

**영향**: codex 시작 후 사용자 첫 입력 전까지 SessionStart hook이 안 와서 cliState='inactive' 머무름. UI badge 잘못.

**중요한 함의**: cliState='inactive'에 머물면 WebInputBar 비활성 → 사용자 첫 메시지 못 보냄 → SessionStart 영원히 안 옴 → **dead state**. 따라서 ready 감지가 필수.

**해결**: status-manager 폴링이 신뢰성 있는 TUI ready 신호를 받으면 **synthetic hook 발사** → 기존 hook 처리 흐름 재사용.

**다층 ready 감지** (확인된 코드 근거 기반):

| Layer | 신호 | 비용 | 정확성 |
| --- | --- | --- | --- |
| 1 | `provider.isAgentRunning(panePid)` true (codex Rust 자식 PID 검출) | 낮음 (pgrep + ps args) | 너무 이름 — binary up 즉시 true, TUI 미렌더 가능 |
| 2 | pane title이 shell-style 아님 — purplemux tmux conf의 `<command>\|<path>` 형식 깨짐. codex가 SessionConfigured 후 `set_terminal_title` 호출 시 OSC 0 발사 (`chatwidget.rs:2061`). | 낮음 (`getPaneTitle` 1회) | 양호 — backend session 설정 완료 보장. composer 렌더는 직후 |
| 3 | pane content에 `›` (U+203A) 또는 `!` (bash 모드) 포함. codex composer의 입력 prompt indicator (`chat_composer.rs:4334-4351`) | 중간 (`capturePaneAtWidth` 캡처) | 가장 정확 — composer 실제 렌더링 확인 |

**Phase 1 — Layer 1+2+3 통합** (race condition 회피 위해 처음부터 Layer 3 포함):
```ts
// status-manager poll() 안
const provider = getProviderByPanelType(tab.panelType);
if (provider && paneInfo?.pid && existing.cliState === 'inactive') {
  // Layer 1: process detection
  const running = await provider.isAgentRunning(paneInfo.pid, childPids);
  if (!running) return;

  // Layer 2: pane title이 shell-style 아님 (OSC 0 발사됨 = SessionConfigured 통과)
  const paneTitle = await getPaneTitle(tab.sessionName);
  const isShellStyleTitle = paneTitle && /^[^|]+\|[^|]+$/.test(paneTitle);
  if (isShellStyleTitle) return;

  // Layer 3: pane content에 composer 마커 (`›` or `!`) — composer 렌더링 완료 보장
  const content = await capturePaneAtWidth(tab.sessionName, /* width */ 100);
  const hasComposerMarker = content && (content.includes('›') || content.includes('!'));
  if (!hasComposerMarker) return;  // 다음 폴링 사이클 재시도

  // 3 layer 모두 통과 — TUI ready 확정
  this.updateTabFromHook(tab.tmuxSession, 'session-start', undefined);
}
```

**왜 Layer 3까지 Phase 1에서 포함**:
- Layer 1+2만으로 idle 전환 시: composer 미렌더 미세 윈도우(수백ms) 존재 → 사용자가 즉시 메시지 보내면 codex가 무시/오인 처리.
- Layer 3 (`capturePaneAtWidth` ~수십 ms 비용)이 false positive 완전 제거.
- 폴링 사이클(1-2초)에 캡처 1회 추가는 부담 없음.

**Phase 1.5 추가 가능 (선택)**: 이벤트 기반 트리거(tmux 콘텐츠 변경 watch)로 latency↓. 우선 폴링 충분.

**Idempotent 체크 불필요** — cliState='inactive'에서만 실행되니 한 번 'idle' 가면 다시 진입 안 함. 실제 SessionStart hook이 사용자 첫 메시지 후 도착해도 cliState는 이미 다른 상태(busy/needs-input/...)라 inactive 분기 안 들어감.

**False positive 방지**:
- `isAgentRunning` 단독으로 idle 전환 안 함
- 모든 layer 만족할 때만 synthetic hook
- 미통과 시 cliState='inactive' 유지 + 다음 폴링 사이클 재시도 (사용자는 잠깐 입력창 비활성, 1-2초 내 활성화)

**폴링 vs 이벤트 기반**:
- Phase 1/1.5는 **폴링**(기본 1-2초 사이클). 충분히 반응 빠르고 단순.
- 이벤트 기반(tmux 콘텐츠 변경 watch)는 latency↓이지만 구현 복잡. Phase 2 옵션.

#### A2. Agent 종료 시 cliState 복귀
**상황**: 사용자가 codex/claude TUI에서 `/quit` 또는 Ctrl+D → 프로세스 종료 → 쉘 복귀.

**문제**: 종료 시 hook 미발사 (Stop hook은 turn 종료만, application 종료 시는 안 옴). 기존 status-manager는 **`busy` stuck 케이스만** isAgentRunning 검사 + 'idle' 전환. 일반 종료(idle 상태에서)는 cliState가 그대로 유지 → UI가 잘못된 "agent ready" 표시.

**해결** — 폴링 사이클마다 일반 검사 추가:
```ts
// status-manager poll() 일반 사이클 (Phase 1 추가)
const agentRunning = paneInfo?.pid && provider
  ? await provider.isAgentRunning(paneInfo.pid, childPids)
  : false;

if (!agentRunning
    && existing.cliState !== 'inactive'
    && existing.cliState !== 'unknown') {
  // 종료된 agent → inactive 복귀
  this.applyCliState(tab.id, existing, 'inactive', { silent: true });
  this.persistToLayout(existing);
  this.broadcastUpdate(tab.id, existing);
  continue;
}
```

Claude/Codex 모두 영향 (Claude도 `/exit` 후 같은 시나리오. 지금까지 별 문제 없었지만 명시적 처리 안 됨).

**회귀 검증 필요**:
- Claude의 정상 종료 후 새 명령 실행 흐름이 깨지지 않는지
- Codex auto-resume 직후 잠깐 process 미감지 윈도우가 inactive로 떨어뜨리지 않는지 (auto-resume 흐름은 send-keys → codex 시작까지 1-2초. 첫 폴링에서 미감지 → inactive로 갔다가 다음 폴링에서 다시 idle로 가는 ping-pong. 짧은 시간이라 OK이지만 UX 짚을 만함)

#### B. send-keys 분리 정책 (text와 `\r` 분리)
**Codex 동작**: `text + '\r'`을 한 batch로 sendStdin하면 **줄바꿈으로 인지**. Codex bracketed paste 처리 또는 input parser가 둘을 합친 stream으로 받아 처리.

**해결**: text와 `\r`을 별도 sendStdin 호출로 분리. `web-input-bar.tsx:236-237`이 이미 적용한 패턴(50ms setTimeout):
```ts
sendStdin(content);
setTimeout(() => sendStdin('\r'), 50);
```

**Phase 1 적용**: 통일 헬퍼로 모든 명령 발사 사이트 치환:
```ts
// 신규: src/lib/send-command.ts (또는 공용 위치)
export const sendCommandLine = (sendStdin: (s: string) => void, cmd: string) => {
  sendStdin(cmd);
  setTimeout(() => sendStdin('\r'), 50);
};
```

영향 사이트 (Claude도 통일):
- `pane-container.tsx:335` (`sendStdin(`${cmd}\r`)`)
- `pane-container.tsx:689` (handleNewClaudeSession)
- `pane-container.tsx:696` (/exit)
- `mobile-surface-view.tsx:383,388`
- `mobile-terminal-page.tsx:174,180`
- `auto-resume.ts:73` (`await sendKeys(target.tmuxSession, resumeCmd)`)
  - **확인됨**: `sendKeys` 구현(`tmux.ts:328`)이 `tmux send-keys ... <command> Enter` — tmux가 두 인자를 **한 PTY write로 atomic 전송**. text+`\r`이 한 chunk로 codex 입력 파서에 도착 → paste burst 또는 줄바꿈 인지 가능.
  - **분리 필요**: text와 Enter 별도 호출.
    ```ts
    await sendRawKeys(target.tmuxSession, cmd);     // text only
    await new Promise(r => setTimeout(r, 50));
    await sendRawKeys(target.tmuxSession, 'Enter'); // Enter separately
    ```
  - 신규 헬퍼 `sendKeysSeparated(sessionName, command)` 추가하여 callers 통일. Claude도 동일 적용 (영향 없음).

50ms 지연 — Claude도 영향 없이 정상 동작 (이미 web-input-bar에서 검증).

### 작은 안전장치 / 운영 디테일

#### G. Workspace prompt sanitize
`writeCodexPromptFile` 작성 시 `'''` 회피 — TOML triple-quoted literal로 inline 주입할 것이라 prompt 내용에 `'''` 있으면 문자열 종결로 오인.

```ts
const sanitizeForTomlLiteral = (s: string): string =>
  s.replace(/'''/g, "' ''");  // ''' → ' '' (의미 보존, 종결 회피)
```

`buildCodexLaunchCommand`가 prompt 파일 읽고 `'''${sanitized}'''` 형태로 wrap.

#### H. Session-list cwd 매칭 정책
Codex 세션은 **시작 시점 cwd로 기록**. 사용자 워크스페이스 cwd가 변경된 경우 같은 세션이 다른 디렉토리로 보임.

**Phase 1.5 정책**: 워크스페이스의 첫 번째 directory 기준 cwd 필터링 (Claude session-list 패턴과 동일). cwd 불일치 세션은 표시 안 함. 모두 보기 토글은 Phase 2.

```ts
listCodexSessions({ cwd: workspace.directories[0] })
  // → 그 cwd에서 시작된 세션만
```

#### I. 모바일/데스크탑 패널 동기화
`CodexPanel` ↔ `MobileCodexPanel` 두 파일 — `ClaudeCodePanel`/`MobileClaudeCodePanel` 짝 패턴 따름. 헤더/세션 체크/입력 영역 같은 props 시그니처 유지하여 두 파일이 거의 미러.

#### J. 폴링 비용
- `getPaneTitle`: Claude 검출에서 이미 호출 중. Codex는 호출 횟수 동일 (탭당 1회/사이클).
- `capturePaneAtWidth`: 가장 비싼 호출(수십 ms). **`cliState='inactive'` + Layer 1+2 통과 후에만** 실행. 활성 탭 수개 × 가끔 호출이라 오버헤드 무시 가능.
- 폴링 사이클: tab 수에 따라 30s/45s/60s (`POLL_INTERVAL_*`). 평균 사용자(<10탭)는 30s 사이클. 충분히 여유.

### 미해결/Phase 1 범위 밖
- **PermissionRequest 응답 흐름** — 사용자 yes/no를 codex로 어떻게 전달? Claude는 stdin으로 1/2 키. Codex 동일 메커니즘인지 확인 필요. Phase 1은 일단 페인 캡처 후 `1`/`2` send-keys 가정.
- **PreToolUse/PostToolUse hook 활용** — 현재 어휘에 없음. 등록은 하지만 status-manager에서 무시. Phase 2에서 currentAction 추적용으로 활용 가능.
- **SessionStart `source=clear` 처리** — 같은 탭의 새 session_id로 갱신하는 흐름 (auto handled by hook payload's session_id replacement).
- **사용자 hook 명령 충돌 사례** — 우리가 머지해서 넣지만, 사용자 hook이 우리 hook script보다 먼저 실행되면서 stdin을 소비하는 케이스 등. 일반 `[hooks.E]` 배열은 codex가 모두 실행하므로 stdin은 각자 받음 (확인 필요).

### 수동 검증 시나리오 (구현 후)
1. 새 Codex 탭 생성 → `codex` 입력 → SessionStart hook 도착 → `agentSessionId` 채움 → busy 진입
2. prompt 입력 → UserPromptSubmit → `lastUserMessage` 갱신 → busy 유지
3. 응답 완료 → Stop → ready-for-review
4. 권한 요청 → PermissionRequest → needs-input → 페인 타이틀 `[ ! ] Action Required` 확인
5. `/clear` → SessionStart(source=clear) → 새 `agentSessionId`
6. `codex resume <id>` 직접 입력 vs purplemux auto-resume 둘 다 정상 동작
7. 사용자가 자체 hook 등록한 상태(예: code-notify)에서 우리 hook 동시 실행
8. 서버 재시작 → auto-resume → 셸 ready 타이밍(500ms) 충분한지

### 문서 동기화 (구현 시 같이)
- `docs/DATA-DIR.md` — `~/.purplemux/codex-hook.sh`, `workspaces/{wsId}/codex-prompt.md` 추가
- `docs/STATUS.md` — codex 통합 플로우 (cliState 어휘 그대로지만 hook 경로 다름)
- `CLAUDE.md` rule 14 — codex provider 함수 매핑 추가 (직접 ps/lsof 호출 금지 정책 유지)

## 오픈 이슈 / 보완 필요

1. **Codex TUI 페인 타이틀 패턴**: 결정됨.
   - 메커니즘: OSC 0 (`\x1b]0;<title>\x07`) — Claude와 동일, tmux가 `pane_title`로 캡처
   - 기본 형식: `<spinner> <project-name>` (config `tui_terminal_title=["activity", "project-name"]` 기본값)
   - spinner: `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` (10 프레임, 100ms 간격)
   - 입력 대기: **`[ ! ] Action Required`** ↔ `[ . ] Action Required` (1초 깜박임)
   - Run-state: `Ready / Working / Thinking / Waiting` (아이템 명시 시)
   - **Claude와 결정적 차이**: 사용자 메시지 요약이 페인 타이틀에 **없음** (default). 따라서 summary 추출 경로 변경 필요.
   - **Summary 출처 결정**: `UserPromptSubmit` hook payload의 `prompt` 필드 (페인 타이틀 아님). `parsePaneTitle`은 needs-input 보조 신호 (Action Required 매칭) + busy 보조 (spinner 매칭)에만 사용.

2. **Codex 자식 프로세스 구조**: 결정됨.
   - 트리: `shell → node (codex.js npm shim) → codex (Rust binary)` — 2단계
   - npm shim(`codex-cli/bin/codex.js`)이 `spawn(binaryPath, ...)`로 Rust 바이너리 자식 생성 (exec 대체 아님)
   - Step 2의 `session-detection.ts`가 이미 grandchild 확장 처리 → detection 로직 재사용 OK
   - **`matchesProcess` 시그니처 확장 필요**: Claude/Codex 모두 직접 자식이 `node`라 충돌. `matchesProcess(commandName, args?: string)`로 확장하여 argv로 disambiguation.
     ```ts
     // Claude
     matchesProcess: (cmd, args) => cmd === 'claude' || (cmd === 'node' && args?.includes('claude.js'))
     // Codex
     matchesProcess: (cmd, args) => cmd === 'codex' || (cmd === 'node' && args?.includes('codex.js'))
     ```
   - `getProviderByProcessName` 호출 사이트(`auto-resume.ts:62` 등)에서 args도 같이 전달하도록 수정 필요.

3. **Hook endpoint 인증**: 결정됨. Claude는 `--settings` 머지 파일에 토큰 임베드. Codex는 `~/.purplemux/codex-hook.sh` 셸 스크립트가 launch 시 `~/.purplemux/{port,cli-token}` 파일에서 읽어 `curl -H` 발사. 명령줄 노출 없음.

4. **Approval 정책 기본값**: 결정됨. `useConfigStore.dangerouslySkipPermissions` 단일 토글 유지. 켜면 Claude `--dangerously-skip-permissions` + Codex `--yolo`(`--dangerously-bypass-approvals-and-sandbox`) 동시 적용. provider별 분리는 명확한 요구가 생기면 그때 갈라기.

5. **State DB**: 결정됨. **사용 안 함**. Codex의 SQLite state DB는 내부 스키마라 호환성 보장 없고, 동시 락 충돌 위험 있음. 디렉토리 스캔(`~/.codex/sessions/YYYY/MM/DD/`)이 일자 파티셔닝이라 부하 적고, hook payload의 `transcript_path`가 정확한 jsonl 경로를 직접 알려줘서 충분. 향후 detection 성능이 문제될 때 재검토.

6. **Auto-resume 호환성**: 결정됨. **코드 변경 없음, 구현 후 실측 검증**. `auto-resume.ts`는 Step 2에서 provider-aware로 작성됨 — `provider.readSessionId(tab)` + `provider.buildResumeCommand(sessionId, opts)` 경유. Codex provider가 `codex resume <SESSION_ID>` 반환하면 자동 처리. 다만 셸 ready 대기(`SHELL_READY_DELAY_MS = 500`) 타이밍이 Codex Rust 바이너리에 적합한지는 실 환경에서 확인 필요.

7. **`codex resume` + `-c` 인자 호환성**: 검증 완료(코드 추적).
   - `cli/src/main.rs:1614` `prepend_config_flags(...)` — 루트 `-c` 오버라이드가 resume 인자에 propagate
   - `core/src/session/session.rs:769` — 새/resume 무관하게 `build_hooks_for_config(&config, ...)` 동일 경로
   - `core/src/config/mod.rs:2628` — `developer_instructions` 동일 머지 경로
   - rollout 파일은 history만 저장. config는 매 실행마다 `-c`로 새로 적용.
   - **simplification**: `buildLaunchCommand`/`buildResumeCommand`가 거의 동일 — 차이는 `resume <id>` 추가뿐. `buildCodexLaunchCommand({ ..., resumeSessionId? })` 단일 빌더로 통합.

7. **Inline `developer_instructions` 길이 한계**: 현재 prompt는 약 2KB로 ARG_MAX(256KB+)에 비해 충분히 작음. 향후 워크스페이스 컨텍스트가 커지면(예: 프로젝트 README 포함) 한계 도달 가능. 그 때는 `model_instructions_file` 같은 파일 기반으로 fallback.

8. **`-c developer_instructions=...` escaping**: Codex는 TOML 파싱 시도 후 실패하면 raw string 처리. 따옴표/줄바꿈 포함 시 셸 escaping 필요. 실제 테스트:
   ```bash
   codex -c developer_instructions="$(cat ~/.purplemux/.../codex-prompt.md)"
   ```
   `$()` substitution 후 inline arg로 들어가니 OK이지만, prompt 내용에 따옴표/`$` 포함 시 cat 출력 그대로 전달되는지 검증 필요.

## 참고 파일 (codex 저장소)

| 파일 | 내용 |
| --- | --- |
| `codex-rs/cli/src/main.rs` | CLI 진입점, 서브커맨드 정의 |
| `codex-rs/tui/src/cli.rs` | 인터랙티브 TUI 플래그 |
| `codex-rs/exec/src/cli.rs` | 비대화형 exec 플래그 |
| `codex-rs/utils/cli/src/shared_options.rs` | 공통 플래그 |
| `codex-rs/rollout/src/recorder.rs` | jsonl 파일 경로 규칙 |
| `codex-rs/rollout/src/list.rs` | 세션 인덱스 조회 API |
| `codex-rs/protocol/src/protocol.rs` | `RolloutItem`, `SessionMeta` 타입 |
| `codex-rs/hooks/src/lib.rs` | hook 이벤트 종류 |
| `codex-rs/hooks/src/legacy_notify.rs` | legacy notify 페이로드 형식 |
| `codex-rs/utils/home-dir/src/lib.rs` | `CODEX_HOME` 해석 |
| `codex-rs/core/src/agents_md.rs` | AGENTS.md 시스템 프롬프트 로딩 |
| `docs/config.md` | 설정 문서 |
