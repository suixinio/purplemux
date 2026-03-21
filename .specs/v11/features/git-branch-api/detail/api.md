# API 연동

## REST API

### GET /api/git/branch

tmux 세션의 cwd에서 현재 git 브랜치를 조회한다.

#### 요청

```
GET /api/git/branch?tmuxSession={name}
```

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| tmuxSession | string | O | tmux 세션 이름 |

#### 성공 응답 (200)

```json
{
  "branch": "feature/fix-bug"
}
```

git 저장소가 아닌 경우:

```json
{
  "branch": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| branch | string \| null | 현재 브랜치명, git 저장소 아니면 null |

#### 에러 응답

| 상태 | 코드 | 조건 |
|---|---|---|
| 400 | `missing-param` | tmuxSession 파라미터 누락 |
| 404 | `tmux-session-not-found` | tmux 세션 없음 |
| 500 | `git-error` | git 명령어 실행 실패 |

## 내부 모듈

### src/lib/git-branch.ts

```typescript
// tmux 세션의 cwd에서 git 브랜치 조회
const getGitBranch: (tmuxSession: string) => Promise<string | null>
```

내부 동작:

1. `tmux display-message -t {session} -p "#{pane_current_path}"` → cwd
2. `git -C {cwd} rev-parse --abbrev-ref HEAD` → branch
3. exit code 0 → branch 반환
4. exit code 128 (not a git repo) → null 반환
5. 기타 에러 → throw

## 파일 구조

```
src/
├── lib/
│   └── git-branch.ts            ← 신규: git 브랜치 조회
└── pages/api/
    └── git/
        └── branch.ts            ← 신규: GET /api/git/branch
```

## 에러 처리

| 에러 | 처리 |
|---|---|
| tmux 세션 없음 | 404 |
| git 미설치 | 500, `{ error: "git not found" }` |
| git 저장소 아님 | 200, `{ branch: null }` |
| git 명령어 타임아웃 (5초) | 500 |
