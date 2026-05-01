# 화면 구성

## 1. 8개 신규 컴포넌트 — 위치 및 시각 트리트먼트

모두 `src/components/features/timeline/` 디렉토리.

### 1.1 `approval-request-item.tsx`

```
┌──────────────────────────────────────────────────┐
│ [AlertCircle · 파란]  권한 요청 (Exec)           │
│                                                  │
│ $ rm -rf node_modules                            │
│ cwd: /Users/.../my-project                       │
│                                                  │
│ 결과: 거부됨 / 승인됨                            │  ← timeline 후행 표시 (실시간 처리는 permission-prompt-card)
└──────────────────────────────────────────────────┘
```

### 1.2 `exec-command-stream-item.tsx`

```
┌──────────────────────────────────────────────────┐
│ [Terminal · 회색] $ npm install                  │
│ exit 0 · 12.4s                                   │
│                                                  │
│ [▼ 출력 보기]                                    │
│   added 1234 packages in 12s                     │
│   ... (collapsed default)                        │
└──────────────────────────────────────────────────┘
```

| 영역 | 비고 |
| --- | --- |
| 명령 + exit code + duration | 한 줄 |
| stdout | collapsed default, expanded 시 max-height 스크롤 |
| 긴 stdout 모바일 | `overflow-x-auto` (가로 스크롤 OR word-break) |

### 1.3 `web-search-item.tsx`

```
┌──────────────────────────────────────────────────┐
│ [Globe · 청록] 웹 검색                           │
│ "next.js 16 router migration"                    │
│                                                  │
│ 결과 5건                                         │
│ 1. Next.js 16 Router Guide — nextjs.org          │
│ 2. ...                                           │
└──────────────────────────────────────────────────┘
```

### 1.4 `mcp-tool-call-item.tsx`

```
┌──────────────────────────────────────────────────┐
│ [Plug · 보라] MCP — context7                     │
│ resolve-library-id                               │
│                                                  │
│ [▼ 자세히 보기]                                  │
│   arguments: { libraryName: "react" }            │
│   result: ...                                    │
└──────────────────────────────────────────────────┘
```

### 1.5 `patch-apply-item.tsx`

```
┌──────────────────────────────────────────────────┐
│ [FileEdit · 초록] Patch                          │
│ 3개 파일 수정 · 성공                             │
│                                                  │
│ • src/foo.ts (modify)                            │
│ • src/bar.ts (create)                            │
│ • src/baz.ts (delete)                            │
│                                                  │
│ [▼ Diff 보기]                                    │
│   (기존 ToolCall diff 컴포넌트 재사용)           │
└──────────────────────────────────────────────────┘
```

### 1.6 `context-compacted-item.tsx`

```
┌──────────────────────────────────────────────────┐
│ [Compress · 회색] 컨텍스트 압축                  │
│ 12.4k → 3.2k tokens (-75%)                       │
└──────────────────────────────────────────────────┘
```

Claude pre/post-compact와 시각 트리트먼트 동일 — 단순 표시.

### 1.7 `reasoning-summary-item.tsx`

```
┌──────────────────────────────────────────────────┐
│ [Brain · 회색] Reasoning                         │
│                                                  │
│ Summary:                                         │
│   - User wants to add authentication             │
│   - Need to check existing auth middleware       │
│   - Plan: scaffold Next.js auth pages            │
│                                                  │
│ ─────────────────────────────────────────        │
│ ℹ️ 상세한 reasoning은 표시되지 않습니다           │
│   (encrypted_content)                            │
└──────────────────────────────────────────────────┘
```

| 영역 | 비고 |
| --- | --- |
| Summary list | `summary[]` 텍스트 표시 |
| 안내 문구 | "Reasoning hidden" — encrypted_content 미해독 |

### 1.8 `error-notice-item.tsx`

```
┌──────────────────────────────────────────────────┐
│ [XCircle · 빨강] Error                           │
│                                                  │
│ Failed to apply patch: file not found            │
│                                                  │
│ [▼ 자세히 보기]                                  │
│   (full message + retryStatus 등)                │
└──────────────────────────────────────────────────┘
```

### Severity별 시각 분기

| severity | 색상 | 아이콘 | 추가 |
| --- | --- | --- | --- |
| `error` | `bg-red-50 border-red-500` | `XCircle` | — |
| `warning` | `bg-yellow-50 border-yellow-500` | `AlertTriangle` | — |
| `stream-error` | `bg-yellow-50 border-yellow-500` | `WifiOff` | `retryStatus` 배지 |
| `guardian-warning` | `bg-purple-50 border-purple-500` | `Shield` | — |

다크 모드: `bg-red-950/20`, `bg-yellow-950/20` 등 muted 변형.

## 2. timeline-view.tsx 변경 사이트 (3곳)

### 2.1 Import 영역 (line ~17-22)

```tsx
import { ApprovalRequestItem } from './approval-request-item';
import { ExecCommandStreamItem } from './exec-command-stream-item';
import { WebSearchItem } from './web-search-item';
import { McpToolCallItem } from './mcp-tool-call-item';
import { PatchApplyItem } from './patch-apply-item';
import { ContextCompactedItem } from './context-compacted-item';
import { ReasoningSummaryItem } from './reasoning-summary-item';
import { ErrorNoticeItem } from './error-notice-item';
```

### 2.2 TimelineEntryRenderer switch (line ~134-155)

```tsx
const TimelineEntryRenderer = ({ entry }: { entry: ITimelineEntry }) => {
  switch (entry.type) {
    // ... 기존 12 case ...
    case 'approval-request': return <ApprovalRequestItem entry={entry} />;
    case 'exec-command-stream': return <ExecCommandStreamItem entry={entry} />;
    case 'web-search': return <WebSearchItem entry={entry} />;
    case 'mcp-tool-call': return <McpToolCallItem entry={entry} />;
    case 'patch-apply': return <PatchApplyItem entry={entry} />;
    case 'context-compacted': return <ContextCompactedItem entry={entry} />;
    case 'reasoning-summary': return <ReasoningSummaryItem entry={entry} />;
    case 'error-notice': return <ErrorNoticeItem entry={entry} />;
    // thinking case 없음 — Claude 전용 timeline 미표시 정책 유지
    // agent-group case 유지 — Claude 전용
    default: return null;  // 알 수 없는 type 무시
  }
};
```

### 2.3 groupedItems() — 변경 없음

begin/delta/end 묶음은 파서 책임 — timeline-view groupedItems는 sub-agent grouping(`agent-group`)만 처리.

## 3. CodexPanel placeholder 제거

### Phase 2 (placeholder)

```tsx
// codex-panel.tsx Phase 2
<div className="flex items-center justify-center h-full">
  타임라인 통합 준비 중
</div>
```

### Phase 3 (정식 마운트)

```tsx
// codex-panel.tsx Phase 3
<TimelineView
  jsonlPath={tab.agentState.jsonlPath}
  tabId={tab.id}
  // ClaudeCodePanel과 동일 props
/>
```

ClaudeCodePanel과 props 통합 — 향후 `AgentPanel` 단일 컴포넌트 통합 가능.

## 4. 모바일 패리티

Desktop과 동일 `TimelineView` 컴포넌트 재사용:

| 컴포넌트 | 모바일 주의 |
| --- | --- |
| `exec-command-stream-item` | expanded stdout: `overflow-x-auto` 또는 `word-break` (긴 stdout 깨짐 방지) |
| `approval-request-item` | 버튼 `min-h-11` (44px 터치 타겟) |
| `patch-apply-item` | diff: 기존 ToolCall diff 컴포넌트 (mobile 검증 완료) |
| `web-search-item` | 결과 항목 `min-h-12` |
| `mcp-tool-call-item` | 자세히 보기 expanded 스크롤 가능 |
| `context-compacted-item` | 단순 표시 — 모바일 영향 없음 |
| `reasoning-summary-item` | summary 긴 경우 expand/collapse |
| `error-notice-item` | message 전체 표시 시 `overflow-x-auto` |

신규 컴포넌트는 기존 timeline 컴포넌트 반응형 패턴(`min-w-0 flex-1`, `shrink-0`, `truncate`) 준수.

## 5. 빈 / 로딩 / 에러 상태

| 영역 | 표시 |
| --- | --- |
| Timeline 비어있음 | "아직 메시지가 없습니다" + 입력 안내 |
| 로딩 (initial parseAll) | skeleton entry 3개 |
| 파서 라인 1개 실패 | `error-notice` entry로 흡수 → 사용자가 보고 가능 |
| 파서 인스턴스 throw | 토스트 + 마지막 entry 유지 + 다음 사이클 재시도 |

## 6. 인터랙션 피드백

| 액션 | 피드백 |
| --- | --- |
| 자세히 보기 toggle (exec-command-stream, mcp, patch, error-notice) | height transition (200ms ease-out) |
| 새 entry append | fade-in (150ms ease-out) — 갑자기 튀어나오지 않음 |
| 자동 scroll-to-bottom | 사용자가 위로 스크롤 중이면 disabled (기존 패턴) |
| 카드 hover | 배경 강조 (`hover:bg-accent/50`) |
| 코드 블록 클릭 | 복사 가능 (`onClick` 시 클립보드 + 토스트) |

## 7. 전환 애니메이션

- 새 entry append: 150ms ease-out fade-in + slide-up
- toggle expand/collapse: 200ms height transition
- error-notice 깜박임: 첫 등장 시 1회 (`animate-pulse-once`)
- scroll-to-bottom: smooth scroll (300ms)

## 8. 접근성

- 각 entry `role="article"` (semantics)
- 자세히 보기 토글 `aria-expanded` 동기화
- 코드 블록 `<pre><code>` (스크린리더 식별)
- error-notice는 `role="alert"` (스크린리더 즉시 안내)
- `prefers-reduced-motion`: 전환 즉시, 깜박임 정적

## 9. STYLE.md 팔레트 준수

- 카드 배경: `bg-card`
- 좌측 띠: severity별 색상 (위 표)
- 코드 블록: `bg-muted font-mono text-sm`
- 메타 텍스트: `text-muted-foreground`
- Codex 차트/카드 강조 색: 청록계 (Claude 보라계와 구분)

## 10. 가상 스크롤

기존 timeline-view에 적용된 `react-virtuoso` 그대로 — 신규 8개 컴포넌트도 동일 가상화 영향권. 추가 설정 불필요.
