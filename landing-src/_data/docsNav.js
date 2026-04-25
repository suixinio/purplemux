// Each item here produces a real page. Add entries only when the underlying
// markdown/njk file exists in both /docs and /docs/ko so the sidebar never
// hands visitors a 404.
module.exports = [
  {
    group: { en: 'Getting Started', ko: '시작하기' },
    items: [
      { slug: 'quickstart', label: { en: 'Quickstart', ko: '빠른 시작' } },
      { slug: 'installation', label: { en: 'Installation', ko: '설치' } },
      { slug: 'browser-support', label: { en: 'Browser support', ko: '브라우저 지원' } },
      { slug: 'first-session', label: { en: 'First session', ko: '첫 세션' } },
    ],
  },
  {
    group: { en: 'Workspaces & Terminal', ko: '워크스페이스 & 터미널' },
    items: [
      { slug: 'workspaces-groups', label: { en: 'Workspaces & groups', ko: '워크스페이스와 그룹' } },
      { slug: 'tabs-panes', label: { en: 'Tabs & panes', ko: '탭 & 창' } },
      { slug: 'save-restore', label: { en: 'Save & restore layouts', ko: '레이아웃 저장 & 복원' } },
      { slug: 'git-workflow', label: { en: 'Git workflow panel', ko: 'Git 워크플로 패널' } },
      { slug: 'web-browser-panel', label: { en: 'Web browser panel', ko: '웹 브라우저 패널' } },
    ],
  },
  {
    group: { en: 'Claude Code', ko: 'Claude Code' },
    items: [
      { slug: 'session-status', label: { en: 'Session status', ko: '세션 상태' } },
      { slug: 'live-session-view', label: { en: 'Live session view', ko: '라이브 세션 뷰' } },
      { slug: 'permission-prompts', label: { en: 'Permission prompts', ko: '권한 프롬프트' } },
      { slug: 'quick-prompts-attachments', label: { en: 'Quick prompts & attachments', ko: '퀵 프롬프트 & 첨부' } },
      { slug: 'usage-rate-limits', label: { en: 'Usage & rate limits', ko: '사용량 & 요금 제한' } },
      { slug: 'notes-daily-report', label: { en: 'Notes (AI daily report)', ko: '노트 (AI 데일리 리포트)' } },
    ],
  },
  {
    group: { en: 'Mobile & Remote', ko: '모바일 & 원격' },
    items: [
      { slug: 'pwa-setup', label: { en: 'PWA setup', ko: 'PWA 설정' } },
      { slug: 'web-push', label: { en: 'Web Push notifications', ko: '웹 푸시 알림' } },
      { slug: 'tailscale', label: { en: 'Tailscale access', ko: 'Tailscale 접속' } },
      { slug: 'security-auth', label: { en: 'Security & auth', ko: '보안 & 인증' } },
    ],
  },
  {
    group: { en: 'Customization', ko: '커스터마이즈' },
    items: [
      { slug: 'themes-fonts', label: { en: 'Themes & fonts', ko: '테마 & 폰트' } },
      { slug: 'custom-css', label: { en: 'Custom CSS', ko: '커스텀 CSS' } },
      { slug: 'terminal-themes', label: { en: 'Terminal themes', ko: '터미널 테마' } },
      { slug: 'editor-integration', label: { en: 'Editor integration', ko: '에디터 연동' } },
      { slug: 'sidebar-options', label: { en: 'Sidebar & Claude options', ko: '사이드바 & Claude 옵션' } },
    ],
  },
  {
    group: { en: 'Reference', ko: '레퍼런스' },
    items: [
      { slug: 'keyboard-shortcuts', label: { en: 'Keyboard shortcuts', ko: '키보드 단축키' } },
      { slug: 'data-directory', label: { en: 'Data directory', ko: '데이터 디렉토리' } },
      { slug: 'ports-env-vars', label: { en: 'Ports & env vars', ko: '포트 & 환경변수' } },
      { slug: 'architecture', label: { en: 'Architecture', ko: '아키텍처' } },
      { slug: 'cli-reference', label: { en: 'CLI reference', ko: 'CLI 레퍼런스' } },
      { slug: 'troubleshooting', label: { en: 'Troubleshooting & FAQ', ko: '문제 해결 & FAQ' } },
    ],
  },
];
