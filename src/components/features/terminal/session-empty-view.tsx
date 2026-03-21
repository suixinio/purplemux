import { MessageSquare } from 'lucide-react';

const SessionEmptyView = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
    <MessageSquare size={32} className="opacity-50" />
    <div className="text-center">
      <p className="text-sm font-medium">세션 없음</p>
      <p className="mt-1 text-xs opacity-70">
        터미널에서 claude를 실행하여
        <br />
        새 세션을 시작하세요
      </p>
    </div>
  </div>
);

export default SessionEmptyView;
