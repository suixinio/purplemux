import { useState } from 'react';
import { Button } from '@/components/ui/button';

type TApprovalResult = 'approved' | 'rejected' | null;

interface IApprovalActionsProps {
  onAction: (action: '승인' | '거부') => void;
  disabled?: boolean;
}

const ApprovalActions = ({ onAction, disabled }: IApprovalActionsProps) => {
  const [result, setResult] = useState<TApprovalResult>(null);

  const handleAction = (action: '승인' | '거부') => {
    setResult(action === '승인' ? 'approved' : 'rejected');
    onAction(action);
  };

  if (result) {
    return (
      <span className="mt-2 text-xs text-muted-foreground">
        {result === 'approved' ? '승인됨' : '거부됨'}
      </span>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      <Button
        variant="outline"
        size="xs"
        onClick={() => handleAction('거부')}
        disabled={disabled}
      >
        거부
      </Button>
      <Button
        variant="default"
        size="xs"
        onClick={() => handleAction('승인')}
        disabled={disabled}
      >
        승인
      </Button>
    </div>
  );
};

export default ApprovalActions;
