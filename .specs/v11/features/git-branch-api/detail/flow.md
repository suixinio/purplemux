# 사용자 흐름

## 1. 브랜치 조회 흐름

```
1. 클라이언트: GET /api/git/branch?tmuxSession={name}
2. 서버:
   a. tmux display-message -t {name} -p "#{pane_current_path}" → cwd
   b. cwd 확인 실패 → 404 응답
   c. git -C {cwd} rev-parse --abbrev-ref HEAD 실행
   d. 성공 → { branch: "feature/fix-bug" }
   e. git 저장소 아님 (exit code 128) → { branch: null }
   f. 기타 에러 → 500
3. 클라이언트: 응답을 메타 바에 반영
```

## 2. 폴링 흐름

```
1. useGitBranch 훅 마운트 → 즉시 첫 조회
2. 30초 setInterval 등록
3. 매 30초: 재조회 → 응답으로 branch 상태 갱신
4. 브랜치 변경 감지: 이전 값과 다르면 UI 갱신
5. 언마운트 시: clearInterval
```

## 3. 엣지 케이스

### tmux 세션이 없어짐 (탭 닫힘 등)

```
폴링 중 tmux 세션 삭제됨
├── 서버: 404 응답
├── 클라이언트: branch = null
└── 브랜치 항목 숨김 (에러 표시 없음)
```

### detached HEAD 상태

```
git checkout abc1234 (특정 커밋)
├── git rev-parse --abbrev-ref HEAD → "HEAD"
├── 서버: { branch: "HEAD" }
└── 메타 바: "HEAD" 표시 (detached 상태임을 암시)
```

### cwd 변경 (cd 명령어)

```
터미널에서 cd /other/project
├── 다음 폴링 시 새 cwd 기반 조회
├── 새 프로젝트의 브랜치 반환
└── 메타 바 갱신 (최대 30초 지연)
```
