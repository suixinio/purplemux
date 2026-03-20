# API 연동

> 이 문서는 workspace-api 서버의 REST API 엔드포인트 상세 스펙을 정의한다.

## Workspace 목록 조회

### GET /api/workspace

전체 Workspace 목록과 사이드바 상태를 반환한다.

- **엔드포인트**: `GET /api/workspace`
- **파라미터**: 없음
- **응답 (200)**:
  ```typescript
  interface IWorkspaceListResponse {
    workspaces: IWorkspace[];
    activeWorkspaceId: string | null;
    sidebarCollapsed: boolean;
    sidebarWidth: number;
  }
  ```
- **응답 (500)**: `{ error: string }` — 내부 오류
- **캐시**: 메모리 스토어에서 즉시 반환
- Workspace가 없으면 빈 배열 반환 → 클라이언트가 기본 생성 트리거

## Workspace 생성

### POST /api/workspace

새 Workspace를 생성하고 기본 레이아웃(tmux 세션 포함)을 초기화한다.

- **엔드포인트**: `POST /api/workspace`
- **요청 body**:
  ```typescript
  interface ICreateWorkspaceRequest {
    directory: string;
    name?: string;
  }
  ```
- **유효성 검증**:
  | 규칙 | 실패 시 |
  |---|---|
  | 디렉토리 존재 여부 (`fs.stat`) | 400 `"디렉토리가 존재하지 않습니다"` |
  | 디렉토리인지 확인 (`stat.isDirectory()`) | 400 `"파일이 아닌 디렉토리 경로를 입력하세요"` |
  | 중복 디렉토리 | 400 `"이미 등록된 디렉토리입니다"` |
- **서버 동작**:
  1. Workspace ID: `ws-{nanoid(6)}`
  2. 이름: `name || path.basename(directory)`
  3. tmux 세션 생성: `tmux -L purple new-session -d -s pt-{wsId}-{paneId}-{surfaceId} -c {directory}`
  4. 레이아웃 파일: `workspaces/{id}/layout.json` 생성
  5. `workspaces.json` 갱신
- **응답 (200)**: 생성된 `IWorkspace`
- **응답 (400)**: `{ error: string }` — 유효성 검증 실패
- **응답 (500)**: `{ error: string }` — tmux 세션 생성 실패

## Workspace 삭제

### DELETE /api/workspace/{workspaceId}

Workspace의 모든 tmux 세션을 종료하고 데이터를 삭제한다.

- **엔드포인트**: `DELETE /api/workspace/{workspaceId}`
- **파라미터**: `workspaceId` (path, 필수)
- **서버 동작**:
  1. 해당 Workspace의 모든 탭의 tmux 세션 kill
  2. 활성 WebSocket close code 1000 전송
  3. `workspaces/{id}/` 디렉토리 삭제
  4. `workspaces.json`에서 제거
- **응답 (204)**: No Content
- **응답 (404)**: `{ error: "Workspace를 찾을 수 없습니다" }`

## Workspace 이름 변경

### PATCH /api/workspace/{workspaceId}

Workspace 이름을 변경한다.

- **엔드포인트**: `PATCH /api/workspace/{workspaceId}`
- **요청 body**: `{ name: string }`
- **서버 동작**: 메모리 스토어 갱신 + `workspaces.json` 저장 (디바운스)
- **응답 (200)**: 업데이트된 `IWorkspace`
- **응답 (404)**: `{ error: "Workspace를 찾을 수 없습니다" }`

## 활성 Workspace + 사이드바 상태 저장

### PATCH /api/workspace/active

활성 Workspace ID와 사이드바 상태를 저장한다.

- **엔드포인트**: `PATCH /api/workspace/active`
- **요청 body**:
  ```typescript
  interface IUpdateActiveRequest {
    activeWorkspaceId?: string;
    sidebarCollapsed?: boolean;
    sidebarWidth?: number;
  }
  ```
- 제공된 필드만 갱신 (partial update)
- **서버 동작**: 메모리 스토어 갱신 + `workspaces.json` 저장 (디바운스 300ms)
- **응답 (200)**: OK

## 디렉토리 유효성 검증

### GET /api/workspace/validate

디렉토리 존재 여부와 중복을 확인한다.

- **엔드포인트**: `GET /api/workspace/validate?directory={path}`
- **파라미터**: `directory` (query, 필수) — 디렉토리 절대 경로
- **응답 (200)**:
  ```typescript
  interface IValidateResponse {
    valid: boolean;
    error?: string;
    suggestedName?: string;
  }
  ```
- 유효 시: `{ valid: true, suggestedName: "my-app" }`
- 미존재: `{ valid: false, error: "디렉토리가 존재하지 않습니다" }`
- 파일: `{ valid: false, error: "파일이 아닌 디렉토리 경로를 입력하세요" }`
- 중복: `{ valid: false, error: "이미 등록된 디렉토리입니다" }`

## Workspace별 레이아웃 API (Phase 4 확장)

Phase 4의 `/api/layout` 모든 엔드포인트에 `workspace` 쿼리 파라미터를 추가한다.

### GET /api/layout?workspace={workspaceId}

- Phase 4와 동일한 `ILayoutResponse` 반환
- `workspace` 미지정 시 활성 Workspace (하위 호환)

### PUT /api/layout?workspace={workspaceId}

- Phase 4와 동일한 유효성 검증 + 저장
- 저장 경로: `workspaces/{id}/layout.json`

### POST /api/layout/pane?workspace={workspaceId}

- Phase 4와 동일 (새 Pane 생성)

### GET /api/layout/cwd?workspace={workspaceId}&session={sessionName}

- Phase 4와 동일 (CWD 조회)

### DELETE /api/layout/pane/{paneId}?workspace={workspaceId}

- Phase 4와 동일 (Pane 닫기)

### POST /api/layout/pane/{paneId}/tabs?workspace={workspaceId}

- Phase 4와 동일 (탭 생성)

### DELETE /api/layout/pane/{paneId}/tabs/{tabId}?workspace={workspaceId}

- Phase 4와 동일 (탭 삭제)

### PATCH /api/layout/pane/{paneId}/tabs/{tabId}?workspace={workspaceId}

- Phase 4와 동일 (탭 이름 변경)

## 타입 정의 요약

```typescript
interface IWorkspace {
  id: string;            // "ws-{nanoid(6)}"
  name: string;          // 표시 이름
  directory: string;     // 프로젝트 디렉토리 절대 경로
  order: number;         // 사이드바 내 순서
}

interface IWorkspaceListResponse {
  workspaces: IWorkspace[];
  activeWorkspaceId: string | null;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
}

interface ICreateWorkspaceRequest {
  directory: string;
  name?: string;
}

interface IUpdateActiveRequest {
  activeWorkspaceId?: string;
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
}

interface IValidateResponse {
  valid: boolean;
  error?: string;
  suggestedName?: string;
}
```

## 에러 응답 형식

모든 에러 응답은 동일한 형식:

```typescript
interface IErrorResponse {
  error: string;
}
```

| HTTP 상태 | 의미 |
|---|---|
| 400 | 유효성 검증 실패 (디렉토리 미존재, 중복, 잘못된 요청) |
| 404 | 리소스 미존재 (Workspace, Pane, 탭) |
| 500 | 서버 내부 오류 (tmux 실패, 파일 I/O 실패) |
