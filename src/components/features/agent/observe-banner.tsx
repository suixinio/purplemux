import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IObserveBannerProps {
  agentId: string;
}

const ObserveBanner = ({ agentId }: IObserveBannerProps) => {
  const router = useRouter();

  const handleClose = useCallback(() => {
    router.push(`/agents/${agentId}/workspace`);
  }, [router, agentId]);

  return (
    <div
      className="flex items-center gap-2 bg-ui-amber/10 px-4 py-2 text-xs text-ui-amber"
      role="alert"
    >
      <Eye size={12} />
      <span>관찰 모드 — 에이전트가 작업 중입니다</span>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto h-5 w-5"
        onClick={handleClose}
      >
        <X size={12} />
      </Button>
    </div>
  );
};

export default ObserveBanner;
