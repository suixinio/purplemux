# 화면 구성

## 전체 레이아웃

```
┌─────────────────────────────────────────────────┐
│  [앱 헤더]                                       │
├─────────────────────────────────────────────────┤
│  [← 돌아가기]  backend-bot  🟢 working          │  ← 채팅 헤더
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────┐        │
│  │ 🔵 분석을 시작하겠습니다.             │        │  ← 에이전트 메시지
│  │    10:30                             │        │
│  └─────────────────────────────────────┘        │
│                                                  │
│        ┌─────────────────────────────────────┐  │
│        │ A 프로젝트 인증 시스템 교체해줘       │  │  ← 사용자 메시지
│        │                              10:31  │  │
│        └─────────────────────────────────────┘  │
│                                                  │
│  ┌─────────────────────────────────────┐        │
│  │ ⚠️ JWT와 Session 중 어떤 방식을      │        │  ← question 메시지
│  │    사용할까요?                        │        │
│  │    10:35                             │        │
│  └─────────────────────────────────────┘        │
│                                                  │
│  ┌─────────────────────────────────────┐        │
│  │  ●  ●  ●                            │        │  ← 타이핑 인디케이터
│  └─────────────────────────────────────┘        │
│                                                  │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  [전송]        │  ← 입력 영역
│  │ 메시지를 입력하세요...        │                │
│  └─────────────────────────────┘                │
└─────────────────────────────────────────────────┘
```

## 채팅 헤더

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `flex items-center gap-3 px-4 py-3 border-b` |
| 뒤로가기 | `Button variant="ghost" size="icon"` — `ArrowLeft` size=16 → `/agents` |
| 에이전트명 | `text-sm font-medium` |
| 상태 뱃지 | agent-management 카드와 동일 스타일 + 상태 텍스트 (`text-xs text-muted-foreground`) |
| 설정 링크 | `Settings` 아이콘 `ml-auto` → 설정 Sheet |

## 메시지 영역

### 공통 메시지 스타일

| 요소 | 사용자 메시지 | 에이전트 메시지 |
|------|-------------|---------------|
| 정렬 | 우측 (`justify-end`) | 좌측 (`justify-start`) |
| 배경 | `bg-primary text-primary-foreground` | `bg-muted` |
| 최대 너비 | `max-w-[80%]` | `max-w-[80%]` |
| 라운드 | `rounded-2xl rounded-br-md` | `rounded-2xl rounded-bl-md` |
| 패딩 | `px-4 py-2.5` | `px-4 py-2.5` |
| 텍스트 | `text-sm` | `text-sm` |
| 타임스탬프 | `text-[10px] text-primary-foreground/60 mt-1` | `text-[10px] text-muted-foreground mt-1` |

### 메시지 유형별 스타일

| 유형 | 좌측 아이콘 | 배경 변형 | 추가 요소 |
|------|-----------|----------|----------|
| `report` | 없음 | 기본 `bg-muted` | — |
| `question` | `HelpCircle` size=14 `text-ui-amber` | `bg-ui-amber/10 border border-ui-amber/20` | — |
| `done` | `CheckCircle2` size=14 `text-positive` | `bg-positive/10 border border-positive/20` | "완료" 뱃지 |
| `error` | `AlertCircle` size=14 `text-negative` | `bg-negative/10 border border-negative/20` | — |
| `approval` | `ShieldQuestion` size=14 `text-ui-purple` | `bg-ui-purple/10 border border-ui-purple/20` | 승인/거부 버튼 |

### approval 액션 버튼

```
┌─────────────────────────────────────┐
│ 🛡️ main 브랜치에 직접 push해도       │
│    괜찮을까요?                       │
│                                     │
│    [거부]  [승인]                     │
│    10:42                            │
└─────────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 버튼 컨테이너 | `flex gap-2 mt-2` |
| 승인 | `Button variant="default" size="xs"` |
| 거부 | `Button variant="outline" size="xs"` |
| 처리 완료 시 | 버튼 → "승인됨" 또는 "거부됨" 텍스트로 교체 |

### 날짜 구분선

```
────────── 2026년 4월 4일 (금) ──────────
```

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `flex items-center gap-3 my-4` |
| 선 | `flex-1 h-px bg-border` |
| 날짜 텍스트 | `text-[10px] text-muted-foreground shrink-0` |

## 타이핑 인디케이터

에이전트가 `working` 상태일 때 메시지 영역 하단에 표시.

```
┌──────────────────┐
│  ●  ●  ●          │
└──────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | 에이전트 메시지 위치 (좌측), `bg-muted rounded-2xl rounded-bl-md px-4 py-3` |
| 닷 | `w-1.5 h-1.5 rounded-full bg-muted-foreground/40` |
| 애니메이션 | 3개 닷이 순차적으로 `animate-bounce` (각각 0ms, 150ms, 300ms delay) |

## 입력 영역

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `px-4 py-3 border-t` |
| 입력 필드 | `Textarea` rows=1 auto-resize, `rounded-xl border px-4 py-2.5 text-sm` |
| 전송 버튼 | `Button variant="default" size="icon"` — `SendHorizontal` size=16 |
| 키 바인딩 | Enter → 전송, Shift+Enter → 줄바꿈 |

### 입력 비활성 상태

| 조건 | 표시 |
|------|------|
| `working` | 입력 비활성 + placeholder "응답 대기 중..." + `Loader2 animate-spin` |
| `offline` | 입력 비활성 + placeholder "에이전트 오프라인" |
| `blocked` | 입력 활성 (사용자 응답이 필요한 상태) |

## 새 메시지 플로팅 버튼

사용자가 위로 스크롤한 상태에서 새 메시지 도착 시:

```
                    [↓ 새 메시지]
```

| 요소 | 스타일 |
|------|--------|
| 버튼 | `Button variant="secondary" size="sm" rounded-full shadow-sm` |
| 아이콘 | `ArrowDown` size=14 |
| 위치 | 메시지 영역 하단 중앙, `absolute bottom-4` |
| 클릭 | 최신 메시지로 스크롤 + 버튼 숨김 |

## 로딩/빈/에러 상태

### 초기 로딩

메시지 영역에 스켈레톤 말풍선 3개 (좌-우-좌 패턴)

### 빈 상태 (첫 대화)

```
┌─────────────────────────────────────┐
│                                     │
│            🤖                       │
│   에이전트에게 첫 지시를              │
│   내려보세요                         │
│                                     │
│   예: "A 프로젝트 README 정리해줘"    │
│                                     │
└─────────────────────────────────────┘
```

### WebSocket 연결 에러

채팅 헤더 아래 배너:

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `bg-negative/10 text-negative text-xs px-4 py-2 flex items-center gap-2` |
| 아이콘 | `WifiOff` size=12 |
| 텍스트 | "연결이 끊어졌습니다. 재연결 중..." |

### 메시지 전송 실패

해당 메시지 말풍선에 `AlertCircle` 아이콘 + "재전송" 텍스트 버튼

## 접근성

| 항목 | 처리 |
|------|------|
| 메시지 목록 | `role="log"` `aria-live="polite"` |
| 메시지 | `role="article"` + 역할/시간 aria-label |
| 입력 필드 | `aria-label="메시지 입력"` |
| 전송 버튼 | `aria-label="메시지 전송"` |
| 타이핑 인디케이터 | `aria-label="에이전트가 입력 중"` `aria-live="polite"` |
