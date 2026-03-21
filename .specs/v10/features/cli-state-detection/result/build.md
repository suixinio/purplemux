---
step: build
timestamp: 2026-03-21 10:42
elapsed: 2분 47초
status: completed
---
구현 완료. 변경 파일 2개:

**`src/types/timeline.ts`** — `TCliState` 타입 추가
```typescript
type TCliState = 'idle' | 'busy' | 'inactive';
```

**`src/hooks/use-timeline.ts`** — `deriveCliState` 함수 + `cliState` 파생 상태 추가
- `sessionStatus`가 `active`가 아니면 → `inactive`
- entries가 비어있으면 → `idle`
- 마지막 엔트리가 `assistant-message`면 → `idle`
- 그 외(`user-message`, `tool-call`, `tool-result`, `agent-group`) → `busy`
- `useMemo`로 `sessionStatus`/`entries` 변경 시에만 재계산 (O(1))
- `useTimeline` 반환값에 `cliState` 포함 → 소비자가 바로 사용 가능

추가로 linter auto-fix로 발생한 `setIsSessionTransitioning` 미사용 경고도 정리했습니다.

---

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
