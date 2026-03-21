# 사용자 흐름

## 1. 메뉴 열기/닫기 흐름

```
1. 네비게이션 바 좌측 ☰ 버튼 클릭
2. Sheet 열기: 좌측에서 슬라이드인 + 배경 오버레이
3. 현재 활성 Workspace 자동 펼침 (아코디언)
4. 현재 선택된 Surface 하이라이트
5. 닫기 트리거:
   a. ✕ 버튼 클릭
   b. 배경 오버레이 클릭
   c. Surface 항목 클릭 (선택 후 자동 닫힘)
```

## 2. Workspace 전환 흐름

```
1. 메뉴에서 다른 Workspace 클릭
2. 해당 Workspace 아코디언 펼침 (이전 Workspace 접힘)
3. 첫 번째 Pane → 첫 번째 Surface 자동 하이라이트
4. Surface 클릭 → 메뉴 닫힘 + 해당 Surface 전체 화면
5. 또는: Workspace만 클릭하고 트리에서 원하는 Surface 선택
```

## 3. Surface 선택 흐름

```
1. 트리에서 Surface 항목 클릭
2. 메뉴 닫힘 (200ms 애니메이션)
3. 선택된 Surface로 전체 화면 전환
4. 네비게이션 바 breadcrumb 갱신
5. 탭 인디케이터 갱신
6. WebSocket 연결/재사용
```

## 4. 새 탭 생성 흐름

```
1. Pane 헤더 우측 [+] 버튼 클릭
2. 서버: 새 tmux 세션 생성 (기존 로직 재활용)
   - cwd: 해당 Workspace 디렉토리
3. layout.json 업데이트
4. 트리에 새 Surface 항목 추가
5. 새 Surface 자동 선택 + 메뉴 닫힘
6. 전체 화면 전환 → 새 터미널 표시
```

## 5. 탭 닫기 흐름

```
1. Surface 항목 길게 누르기 (500ms)
2. "닫기" 액션 표시
3. "닫기" 클릭:
   a. 마지막 탭 → 비활성 (닫기 불가)
   b. 그 외 → 즉시 실행
4. tmux 세션 종료 + layout.json 업데이트
5. 트리에서 항목 제거
6. 닫힌 탭이 현재 선택이었으면:
   a. 이전 Surface로 자동 전환
   b. 이전 Surface가 없으면 다음 Surface
```

## 6. 엣지 케이스

### Workspace에 Pane이 1개, Surface도 1개

```
Workspace 펼침 시
├── Pane 헤더 생략 (불필요한 깊이 제거)
├── Surface 항목만 표시 (1단계 들여쓰기)
└── 새 탭 생성 [+]은 Workspace 레벨에 표시
```

### 메뉴 열린 상태에서 외부 데이터 변경

```
데스크톱에서 탭 생성/삭제 → layout.json 변경
├── zustand 스토어에 반영
├── 메뉴가 열려있으면 트리 실시간 갱신
└── 현재 선택된 Surface가 삭제되면 자동 전환
```

### 트리가 매우 깊은 경우

```
Workspace 10개 + 각 Pane 3개 + 각 Surface 5개
├── Sheet 내부 스크롤
├── 현재 활성 Workspace만 펼침 (나머지 접힘)
└── 성능 영향 미미 (정적 리스트)
```
