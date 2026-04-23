import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Spinner from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import useWorkspaceStore from '@/hooks/use-workspace-store';

interface IRenameGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currentName: string;
}

const RenameGroupDialog = ({
  open,
  onOpenChange,
  groupId,
  currentName,
}: IRenameGroupDialogProps) => {
  const ts = useTranslations('sidebar');
  const tc = useTranslations('common');
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setName(currentName);
      setIsSubmitting(false);
    }
  }

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== currentName && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const ok = await useWorkspaceStore.getState().renameGroup(groupId, trimmed);
    setIsSubmitting(false);
    if (ok) onOpenChange(false);
  }, [canSubmit, groupId, trimmed, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && canSubmit) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [canSubmit, handleSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ts('renameGroup')}</DialogTitle>
        </DialogHeader>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting && <Spinner className="mr-1.5 h-3.5 w-3.5" />}
            {tc('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenameGroupDialog;
