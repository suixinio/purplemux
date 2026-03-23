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
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onClick}
      >
        <ArrowDown size={14} />
      </Button>
    </div>
  );
};

export default ScrollToBottomButton;
