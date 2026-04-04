import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface INewMessageButtonProps {
  onClick: () => void;
}

const NewMessageButton = ({ onClick }: INewMessageButtonProps) => (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
    <Button
      variant="secondary"
      size="sm"
      className="rounded-full shadow-sm"
      onClick={onClick}
    >
      <ArrowDown className="h-3.5 w-3.5" />
      새 메시지
    </Button>
  </div>
);

export default NewMessageButton;
