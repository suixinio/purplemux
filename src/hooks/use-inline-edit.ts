import { useCallback, useEffect, useRef, useState } from 'react';

interface IUseInlineEditOptions {
  value: string;
  onCommit: (next: string) => void;
  onEmpty?: () => string | null | undefined;
}

const useInlineEdit = ({ value, onCommit, onEmpty }: IUseInlineEditOptions) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setDraft(value);
    setIsEditing(true);
  }, [value]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    setIsEditing(false);
    if (!trimmed) {
      const fallback = onEmpty?.();
      if (fallback) {
        if (fallback !== value) onCommit(fallback);
        setDraft(fallback);
        return;
      }
      setDraft(value);
      return;
    }
    if (trimmed !== value) onCommit(trimmed);
  }, [draft, value, onCommit, onEmpty]);

  const cancel = useCallback(() => {
    setIsEditing(false);
    setDraft(value);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    [commit, cancel],
  );

  return {
    isEditing,
    draft,
    setDraft,
    inputRef,
    startEditing,
    commit,
    cancel,
    handleKeyDown,
  };
};

export default useInlineEdit;
