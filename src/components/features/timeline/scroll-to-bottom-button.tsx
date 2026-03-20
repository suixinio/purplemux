import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
}

const ScrollToBottomButton = ({ visible, onClick }: IScrollToBottomButtonProps) => {
  if (!visible) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <Button
        variant="outline"
        size="xs"
        className="rounded-full"
        onClick={onClick}
      >
        <ArrowDown size={12} />
        최신으로 이동
      </Button>
    </div>
  );
};

export default ScrollToBottomButton;
