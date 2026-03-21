# API 연동

## 개요

세션 메타 바는 기존 타임라인 데이터에서 메타 정보를 파생한다. 새로운 API는 git 브랜치 조회 1개만 추가하며 (git-branch-api 참조), 나머지는 기존 인프라를 재활용한다.

## 기존 API 재활용

| API | 용도 |
|---|---|
| ws://api/timeline → timeline:init | 초기 전체 엔트리 → 메타 전체 계산 |
| ws://api/timeline → timeline:append | 새 엔트리 → 증분 업데이트 |
| ws://api/timeline → timeline:session-changed | 세션 전환 → 메타 초기화 |
| GET /api/git/branch | git 브랜치 조회 (git-branch-api) |

## 세션 파서 확장

### src/lib/session-parser.ts

기존 파서에 `usage` 필드 추출을 추가한다.

```typescript
// 기존 ITimelineEntry 확장
interface ITimelineEntry {
  // ... 기존 필드
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

파서 변경:
- JSONL 라인 파싱 시 `usage` 필드가 있으면 추출
- `usage` 필드가 없는 엔트리는 `undefined`로 처리
- 기존 파싱 로직에 영향 없음 (optional 필드 추가)

## 클라이언트 훅

### useSessionMeta

메타 바의 데이터를 관리하는 훅.

```typescript
interface ISessionMeta {
  title: string;
  createdAt: string | null;   // ISO 8601
  updatedAt: string | null;   // ISO 8601
  userCount: number;
  assistantCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface IUseSessionMetaReturn {
  meta: ISessionMeta;
  isExpanded: boolean;
  toggleExpanded: () => void;
}

const useSessionMeta: (entries: ITimelineEntry[]) => IUseSessionMetaReturn
```

내부 동작:

- `entries` 변경 시 증분 계산:
  - 이전 entries 길이 vs 현재 길이 → 새로 추가된 엔트리만 처리
  - 새 엔트리 순회: 타입별 카운터 증가, usage 합산
- `timeline:init` (전체 교체) 시: 전체 재계산
- `isExpanded`: 컴팩트/상세 토글 상태

### useGitBranch

git 브랜치를 폴링 조회하는 훅.

```typescript
interface IUseGitBranchReturn {
  branch: string | null;
  isLoading: boolean;
}

const useGitBranch: (tmuxSession: string) => IUseGitBranchReturn
```

내부 동작:

- 마운트 시 즉시 `GET /api/git/branch?tmuxSession={name}` 호출
- 30초 간격 `setInterval`로 재조회
- 에러 시: `branch = null`, `isLoading = false` (조용히 실패)
- 언마운트 시 인터벌 해제

## 토큰 포맷 유틸리티

```typescript
// 토큰 수를 K/M 단위로 포맷
const formatTokenCount = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
};

// 상세 표시용 쉼표 포맷
const formatTokenDetail = (count: number): string => {
  return count.toLocaleString();
};
```

## 컴포넌트 구조

```
ClaudeCodePanel
├── SessionNavBar (← 세션 목록, 기존 v9)
├── SessionMetaBar (신규)
│   ├── MetaBarCompact (컴팩트 한 줄)
│   └── MetaBarDetail (상세 확장)
├── TimelineView (타임라인, 기존)
├── WebInputBar (입력창, 기존 v10)
└── TerminalContainer (터미널, 기존)
```

## 파일 구조

```
src/
├── components/features/terminal/
│   ├── claude-code-panel.tsx        ← 기존 수정: SessionMetaBar 삽입
│   └── session-meta-bar.tsx         ← 신규: 메타 바 컴포넌트
├── hooks/
│   ├── use-session-meta.ts          ← 신규: 메타 데이터 계산
│   ├── use-git-branch.ts            ← 신규: git 브랜치 폴링
│   └── use-timeline.ts             ← 기존 수정: usage 필드 전달
├── lib/
│   ├── session-parser.ts            ← 기존 수정: usage 필드 추출 추가
│   └── format-tokens.ts             ← 신규: 토큰 포맷 유틸리티
└── types/
    └── timeline.ts                  ← 기존 수정: ITimelineEntry에 usage 추가
```

## 에러 처리

| 에러 | 처리 |
|---|---|
| usage 필드 없음 | 해당 엔트리 토큰 0으로 처리, 에러 없음 |
| git 브랜치 조회 실패 | 브랜치 항목 숨김, 에러 표시 안 함 |
| 엔트리 0개 | "(새 세션)" 표시, 메타 최소화 |
| 타임스탬프 파싱 실패 | 시간 항목 대시 표시 |
