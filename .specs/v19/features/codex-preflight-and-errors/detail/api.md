# API 연동

## 1. Preflight API 확장

### 기존 IPreflightResult 시그니처

```ts
interface IPreflightResult {
  claude: {
    installed: boolean;
    version: string | null;
    path: string | null;
  };
  // ... 기타 ...
  isRuntimeOk: boolean;  // Claude 등 필수 조건 통과 여부
}
```

### v19 확장

```ts
interface IPreflightResult {
  claude: { installed: boolean; version: string | null; path: string | null };
  codex: { installed: boolean; version: string | null; path: string | null };  // 신규
  // ... 기타 ...
  isRuntimeOk: boolean;  // Codex는 영향 없음 (optional)
}
```

### preflight 호출

```ts
// providers/codex/preflight.ts
export const codexPreflight = async (): Promise<IProviderPreflight> => {
  try {
    const result = await execFile('codex', ['--version'], { timeout: 3000 });
    const version = result.stdout.trim();
    const { stdout: pathOut } = await execFile('which', ['codex']);
    return { installed: true, version, path: pathOut.trim() };
  } catch {
    return { installed: false, version: null, path: null };
  }
};
```

### 캐시

```ts
// globalThis.__ptCodexPreflight: { result: IProviderPreflight; checkedAt: number }
const TTL = 60_000;  // 60초

export const getCodexPreflight = async (force = false): Promise<IProviderPreflight> => {
  const g = globalThis as unknown as { __ptCodexPreflight?: { result: IProviderPreflight; checkedAt: number } };
  if (!force && g.__ptCodexPreflight && Date.now() - g.__ptCodexPreflight.checkedAt < TTL) {
    return g.__ptCodexPreflight.result;
  }
  const result = await codexPreflight();
  g.__ptCodexPreflight = { result, checkedAt: Date.now() };
  return result;
};
```

## 2. GET /api/preflight (기존 endpoint 확장)

### Response (확장)

```json
{
  "claude": { "installed": true, "version": "0.51.0", "path": "/usr/local/bin/claude" },
  "codex": { "installed": false, "version": null, "path": null },
  "isRuntimeOk": true,
  "checkedAt": 1714553600000
}
```

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `codex.installed` | boolean | 신규 |
| `codex.version` | string \| null | 신규 |
| `codex.path` | string \| null | 신규 |

### Query 파라미터

- `force=true` → 캐시 무시, 즉시 재실행 (manual refresh)

## 3. 에러 표면화 컴포넌트 — `lib/notifications.ts` (또는 `toast-helpers.ts`)

```ts
export const notifyCodexNotInstalled = () => {
  toast.info(t('codexNotInstalled'), {
    duration: 6000,
    action: {
      label: t('copyCommand'),
      onClick: () => {
        navigator.clipboard.writeText('npm i -g @openai/codex');
        toast.success(t('copied'), { duration: 1000 });
      },
    },
  });
};

export const notifyCodexHookInstallFailed = () => {
  toast.warning(t('codexHookInstallFailed'), { duration: 8000 });
};

export const notifyCodexConfigParseFailed = () => {
  if (sessionStorage.getItem('codex-config-warned-once')) return;
  sessionStorage.setItem('codex-config-warned-once', '1');
  toast.info(t('codexConfigParseFailed'), {
    duration: 6000,
    action: {
      label: t('copyConfigPath'),
      onClick: () => navigator.clipboard.writeText('~/.codex/config.toml'),
    },
  });
};

export const notifyCodexLaunchFailed = (retry: () => void) => {
  toast.error(t('codexLaunchFailed'), {
    duration: 6000,
    action: { label: t('retry'), onClick: retry },
  });
};

export const notifyCodexApprovalSendFailed = () => {
  toast.error(t('codexApprovalSendFailed'), { duration: 8000 });
};

export const notifyCodexApprovalNotApplied = (retry: () => void) => {
  toast.warning(t('codexApprovalNotApplied'), {
    duration: 10000,
    action: { label: t('retry'), onClick: retry },
  });
};
```

## 4. 토스트 i18n 키 (`src/i18n/<lang>/common.json`)

```json
{
  "codexNotInstalled": "Codex CLI를 설치하려면: npm i -g @openai/codex 또는 brew install --cask codex",
  "codexHookInstallFailed": "Codex hook 설치 실패. codex 상태가 정확하지 않을 수 있습니다.",
  "codexConfigParseFailed": "~/.codex/config.toml 파싱 실패. purplemux hook만 적용됩니다.",
  "codexLaunchFailed": "Codex 실행 실패. 터미널을 확인해 주세요.",
  "codexResumeFailed": "Codex 세션 재개 실패.",
  "codexApprovalSendFailed": "권한 응답 전송 실패. 다시 시도해 주세요.",
  "codexApprovalNotApplied": "응답이 codex에 닿지 않았습니다. keymap을 확인하세요.",
  "copyCommand": "명령어 복사",
  "copyConfigPath": "config.toml 경로 복사",
  "copied": "복사됨",
  "retry": "재시도"
}
```

## 5. Logger 인스턴스

| 로거 | 사용 |
| --- | --- |
| `createLogger('codex-preflight')` | A 케이스 (preflight 결과, codex --version 실패) |
| `createLogger('codex-hook')` | B 케이스 (hook script write 실패) |
| `createLogger('codex-config')` | C 케이스 (config.toml 파싱 실패) |
| `createLogger('codex-runtime')` | D/E 케이스 (send-keys 실패) — client-side는 토스트로 끝, server-side만 |

`grep "codex-config" logs/server.log` 로 케이스별 추적 쉬움.

## 6. auto-resume 통합

```ts
// lib/auto-resume.ts
export const resumeAllTabs = async () => {
  const preflight = await getPreflight();
  for (const tab of allTabs) {
    if (tab.panelType === 'codex-cli' && !preflight.codex.installed) {
      logger.info(`Skip resume for codex tab ${tab.id}: codex not installed`);
      continue;
    }
    // ... 기존 resume 로직 ...
  }
};
```

## 7. SyncServer system toast push (B 케이스)

```ts
// server.ts 부트 시
try {
  await ensureCodexHookScript();
} catch (err) {
  logger.error('codex-hook write failed', { err });
  syncServer.queueSystemToast({ key: 'codexHookInstallFailed', severity: 'warning' });
}
```

```ts
// sync-server.ts
interface ISystemToast {
  key: string;
  severity: 'info' | 'warning' | 'error';
  duration?: number;
}

queueSystemToast(toast: ISystemToast): void;
```

클라이언트 첫 연결 시 큐에서 pop → `toast.warning(t(toast.key))` 호출.

## 8. 데이터 타입 영향

| 타입 | 변경 |
| --- | --- |
| `IPreflightResult` | `codex` 필드 추가 |
| `IProviderPreflight` | 변경 없음 (기존 시그니처 재사용) |
| `ITabStoreEntry` | `agentInstalled` 필드 (status-resilience와 통합) |

## 9. 캐싱 전략

| 데이터 | 캐시 | 무효화 |
| --- | --- | --- |
| Preflight 전체 | 메모리 60s TTL | `force=true` query 또는 자동 재호출 |
| Codex 단독 preflight | 메모리 60s TTL | 동일 |
| 토스트 dedup (C) | session storage | 새 세션 시작 시 |

## 10. 페이지네이션 / 정렬 / 필터

본 feature는 단일 결과 read — 해당 없음.

## 11. 실시간 업데이트

| 이벤트 | 채널 | 수신자 |
| --- | --- | --- |
| Preflight 결과 변경 (60s 후 재계산) | sync-server WebSocket `preflight:updated` | 모든 클라이언트 (메뉴/패널 갱신) |
| 시스템 토스트 큐 push (B) | 첫 WebSocket connect 시 cumulative push | 클라이언트 (sonner 호출) |
