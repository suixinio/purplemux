# API 연동

## 조회 API

### 메모리 트리 조회

- **엔드포인트**: `GET /api/agent/[agentId]/memory`
- **응답**:

```typescript
interface IMemoryTreeResponse {
  tree: IMemoryNode[];
  stats: {
    totalFiles: number;
    totalSizeBytes: number;
    agentFiles: number;
    agentSizeBytes: number;
  };
}

interface IMemoryNode {
  name: string;
  path: string;               // ~/.purplemux/agents/ 기준 상대 경로
  type: 'file' | 'directory';
  sizeBytes?: number;         // file만
  modifiedAt?: string;        // file만
  children?: IMemoryNode[];   // directory만
}
```

- **캐시 전략**: 캐시 없음 (에이전트가 수시로 파일 변경)

### 파일 내용 조회

- **엔드포인트**: `GET /api/agent/memory/file`
- **파라미터**:
  - `path` — `~/.purplemux/agents/` 기준 상대 경로
- **응답**:

```typescript
interface IMemoryFileResponse {
  path: string;
  content: string;
  sizeBytes: number;
  modifiedAt: string;
}
```

- **보안**: `~/.purplemux/agents/` 밖의 경로 접근 차단 (path traversal 방지)

### 메모리 검색

- **엔드포인트**: `GET /api/agent/[agentId]/memory/search`
- **파라미터**:
  - `q` — 검색 키워드 (최소 2자)
- **응답**:

```typescript
interface IMemorySearchResponse {
  results: Array<{
    path: string;
    fileName: string;
    matches: Array<{
      line: number;
      content: string;          // 매칭 라인 텍스트
    }>;
  }>;
}
```

- **검색 범위**: `~/.purplemux/agents/` 하위 전체 (shared + 모든 에이전트)
- **캐시 전략**: 캐시 없음

## 변경 API

### 파일 저장

- **엔드포인트**: `PUT /api/agent/memory/file`
- **바디**:

```typescript
interface ISaveMemoryFileRequest {
  path: string;               // 상대 경로
  content: string;
}
```

- **응답**: `{ saved: true, modifiedAt: string }`
- **보안**: path traversal 방지 (agents/ 밖 쓰기 차단)
- **Optimistic UI**: 뷰어 즉시 전환, 실패 시 에디터 롤백

## 클라이언트 상태 관리

### 페이지 로컬 상태

```typescript
interface IMemoryPageState {
  tree: IMemoryNode[];
  stats: IMemoryTreeResponse['stats'];
  selectedPath: string | null;
  fileContent: string | null;
  fileMeta: { sizeBytes: number; modifiedAt: string } | null;
  isEditing: boolean;
  editContent: string;
  isPreview: boolean;
  searchQuery: string;
  searchResults: IMemorySearchResponse['results'] | null;
  isLoading: boolean;
  isSearching: boolean;
  isSaving: boolean;
}
```

## 컴포넌트 구조

```
pages/agents/[agentId]/memory.tsx
├── MemoryHeader                ← 에이전트 정보 + 네비게이션
├── SplitPanel                  ← 좌우 분할
│   ├── MemoryTree              ← 좌측: 트리 + 검색
│   │   ├── SearchBar
│   │   ├── TreeNode (재귀)
│   │   └── SearchResults       ← 검색 모드
│   └── MemoryViewer            ← 우측: 뷰어/에디터
│       ├── FileHeader          ← 파일명 + 편집 버튼
│       ├── MarkdownRenderer    ← 뷰어 모드
│       ├── MarkdownEditor      ← 편집 모드
│       └── FileMeta            ← 파일 정보
└── MemoryStats                 ← 하단 통계 바
```

## 파일 구조

```
src/
├── pages/agents/
│   └── [agentId]/
│       └── memory.tsx            # 메모리 뷰어 페이지
├── components/features/agent/
│   ├── memory-tree.tsx
│   ├── tree-node.tsx
│   ├── memory-viewer.tsx
│   ├── markdown-editor.tsx
│   ├── search-results.tsx
│   └── memory-stats.tsx
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| 트리 조회 실패 | 스켈레톤 → 에러 + 재시도 |
| 파일 조회 실패 | "파일을 읽을 수 없습니다" + 경로 표시 |
| 파일 저장 실패 | 에디터 유지 + toast.error |
| 검색 실패 | "검색 중 오류가 발생했습니다" |
| path traversal 시도 | 403 — 클라이언트에서 사전 차단 |
