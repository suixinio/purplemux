import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ISessionNavBarProps {
  onNavigateToList: () => void;
}

const SessionNavBar = ({ onNavigateToList }: ISessionNavBarProps) => (
  <div className="flex items-center border-b px-4 py-2">
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 text-sm text-muted-foreground hover:text-foreground"
      onClick={onNavigateToList}
    >
      <ChevronLeft size={16} />
      세션 목록
    </Button>
  </div>
);

export default SessionNavBar;
