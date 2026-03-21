# 사용자 흐름

## 1. 모바일 첫 진입 흐름

```
1. 모바일 브라우저에서 접속
2. useMediaQuery: 뷰포트 < 768px 감지
3. 모바일 컴포넌트 트리 렌더링
4. 마지막 활성 Workspace 로드 (zustand 스토어)
5. 해당 Workspace의 첫 번째 Pane → 첫 번째 Surface 자동 선택
6. Surface의 tmux 세션에 WebSocket 연결
7. xterm.js 마운트 (모바일 cols/rows)
8. 터미널 전체 화면 표시
```

## 2. Surface 전환 흐름

```
1. 탭 인디케이터 도트 클릭 (또는 트리 메뉴에서 선택)
2. 현재 Surface의 WebSocket은 백그라운드로 유지
3. 새 Surface의 WebSocket 연결 (이미 연결되어 있으면 재사용)
4. xterm.js 전환: 새 Surface 마운트
5. 탭 인디케이터 도트 업데이트
6. 네비게이션 바 breadcrumb 갱신
```

## 3. 화면 회전 흐름

```
1. 세로 → 가로 (또는 반대) 회전
2. matchMedia 리스너 감지
3. 분기:
   a. 여전히 < 768px → 모바일 유지, xterm.js cols/rows 재계산
   b. >= 768px (태블릿 가로) → 데스크톱 레이아웃으로 전환
4. tmux 세션에 resize 전달
5. 터미널 영역 리사이즈
```

## 4. Workspace 전환 흐름

```
1. 트리 메뉴에서 다른 Workspace 선택
2. 현재 Workspace의 모든 WebSocket 유지 (백그라운드)
3. 새 Workspace의 첫 번째 Surface로 전환
4. 네비게이션 바 breadcrumb 갱신
5. 탭 인디케이터 갱신
```

## 5. 새 탭 생성 흐름

```
1. 트리 메뉴에서 Pane 하위 "+" 버튼 클릭
2. 서버: 새 tmux 세션 생성 (기존 탭 생성 로직 재활용)
3. layout.json 업데이트
4. 메뉴 닫힘
5. 새 탭 자동 선택 → 전체 화면 표시
6. 탭 인디케이터 도트 추가
```

## 6. 탭 닫기 흐름

```
1. 트리 메뉴에서 Surface 항목 길게 누르기 → "닫기" 옵션
2. 마지막 탭이면 → 닫기 불가 (비활성)
3. 확인 없이 즉시 실행
4. tmux 세션 종료 + layout.json 업데이트
5. 이전 또는 다음 Surface로 자동 전환
6. 탭 인디케이터 도트 제거
```

## 7. 엣지 케이스

### 데스크톱 ↔ 모바일 전환 (브라우저 리사이즈)

```
데스크톱에서 브라우저 창 좁힘 → 768px 미만
├── 모바일 레이아웃으로 전환
├── 현재 포커스된 Pane의 활성 Surface를 전체 화면으로
├── WebSocket 연결은 유지
└── 다시 넓히면 데스크톱 복귀 (Pane 레이아웃 원래대로)
```

### Workspace의 모든 탭이 닫힘

```
마지막 탭 닫기 시도 → 차단 (마지막 탭 닫기 불가)
```

### 모바일에서 동시 WebSocket

```
현재 Pane의 Surface들만 WebSocket 유지
├── 현재 보이는 Surface: 활성 연결
├── 같은 Pane의 다른 Surface: 백그라운드 연결 (전환 시 즉시 표시)
└── 다른 Pane/Workspace의 Surface: 연결 해제 (전환 시 재연결)
```
