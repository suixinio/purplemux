# API 연동

> Codex provider 코어는 HTTP API를 새로 추가하지 않는다. 기존 `IAgentProvider` 슬롯 구현 + 내부 모듈 인터페이스만 정의.

## 1. IAgentProvider 슬롯 구현 (`providers/codex/index.ts`)

```ts
export const codexProvider: IAgentProvider = {
  providerId: 'codex',
  panelType: 'codex-cli',
  displayName: 'Codex',
  icon: OpenAIIcon,

  // 프로세스 검출
  matchesProcess: (cmd: string, args?: string[]): boolean => {
    if (cmd === 'codex') return true;
    if (cmd === 'node' && args?.some((a) => a.endsWith('codex.js'))) return true;
    return false;
  },
  isAgentRunning: async (panePid: number): Promise<boolean> => { ... },
  detectActiveSession: async (panePid: number): Promise<TActiveSession> => { ... },

  // Preflight
  preflight: async (): Promise<IProviderPreflight> => { ... },

  // Launch / Resume
  buildLaunchCommand: (ctx: ILaunchContext): string[] => { ... },
  buildResumeCommand: (ctx: IResumeContext, sessionId: string): string[] => { ... },

  // Workspace prompt
  writeWorkspacePrompt: async (ws: IWorkspace): Promise<void> => { ... },

  // Hook config
  buildHookConfig: async (): Promise<string[]> => { ... },  // -c hooks.<E>=[...] 인자 배열

  // Work state observer (Phase 1: helper만)
  attachWorkStateObserver: null,  // Phase 4에서 구현
};
```

## 2. 내부 모듈 시그니처

### `providers/codex/session-detection.ts`

```ts
export const isCodexRunning = async (panePid: number): Promise<boolean>;
export const detectCodexSession = async (panePid: number): Promise<TActiveSession>;
```

### `providers/codex/preflight.ts`

```ts
export const codexPreflight = async (): Promise<{
  installed: boolean;
  version: string | null;
  path: string | null;
}>;
```

- 캐시: 서버 메모리 (`globalThis.__ptCodexPreflight?: { result, checkedAt }`)
- TTL: 60초 (manual refresh로 즉시 갱신 가능)

### `providers/codex/client.ts`

```ts
export const buildLaunchArgs = (ctx: ILaunchContext): string[];
export const buildResumeArgs = (ctx: IResumeContext, sessionId: string): string[];
```

### `providers/codex/prompt.ts`

```ts
export const writeCodexPromptFile = async (ws: IWorkspace): Promise<void>;
export const buildBody = (ws: IWorkspace): string;
export const sanitizeForTomlTripleQuote = (s: string): string;  // ''' 회피
```

### `providers/codex/hook-config.ts`

```ts
export const buildHookEntries = async (): Promise<{
  ourEntries: ICodexHookEntry[];
  userEntries: ICodexHookEntry[];
  toml: string;  // -c hooks.<E>=[...] 직렬화 결과
}>;
```

## 3. 데이터 타입

### `IAgentState` (재사용 — `types/terminal.ts:14-19`)

```ts
interface IAgentState {
  providerId: 'claude' | 'codex';
  sessionId: string | null;
  jsonlPath: string | null;
  summary: string | null;
}
```

Codex는 ITab에 `codex*` legacy 필드 추가하지 않음. Claude는 `claude*` legacy fallback 유지.

### `ICodexHookEntry` (내부)

```ts
interface ICodexHookEntry {
  matcher: string;          // ".*" — 모든 이벤트 매칭
  hooks: Array<{
    type: 'command';
    command: string;        // "~/.purplemux/codex-hook.sh"
  }>;
  display_order?: number;   // deterministic 출력용
}
```

## 4. layout.json 디스크 표현

```json
{
  "id": "tab-xxx",
  "sessionName": "tmux-xxx",
  "name": "Codex Session",
  "panelType": "codex-cli",
  "agentState": {
    "providerId": "codex",
    "sessionId": "01997fee-5078-7d32-aeb3-0b141d322a26",
    "jsonlPath": "/Users/.../rollout-2025-09-25T17-12-28-01997fee....jsonl",
    "summary": "Add user authentication"
  }
}
```

## 5. matchesProcess 호출 사이트 마이그

| 파일 | 변경 |
| --- | --- |
| `lib/auto-resume.ts:62` | `getProviderByProcessName(cmd)` → `getProviderByProcessName(cmd, args)` |
| `lib/status-manager.ts:633` 영역 | 동일 시그니처 변경 |
| `lib/session-detection.ts` | 동일 |

## 6. 에러 처리

| 에러 | 처리 |
| --- | --- |
| `codex --version` 실행 실패 | preflight `installed: false` 반환 (graceful) |
| `codex-prompt.md` write 실패 | `logger.error('codex-prompt write failed')` + launch 시 prompt 없이 진행 (codex 본체 시스템 prompt만) |
| 사용자 `config.toml` 파싱 실패 | `logger.warn` + 우리 entry만 머지 (`codex-preflight-and-errors` C 토스트) |
| TOML 직렬화 실패 (예상 외 입력) | throw → caller가 catch → launch 실패 토스트 |

## 7. 캐싱 전략

| 데이터 | 캐시 위치 | 무효화 |
| --- | --- | --- |
| Preflight 결과 | `globalThis.__ptCodexPreflight` (60s TTL) | manual refresh API |
| 사용자 config.toml 머지 결과 | 매 launch 재계산 (사용자 편집 즉시 반영) | N/A |
| `codex-prompt.md` 내용 | 워크스페이스 변경 시 재작성 (`workspace-store.ts:330/375/404`) | 자동 |
