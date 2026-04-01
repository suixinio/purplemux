import { useState, useCallback } from 'react';
import isElectron from '@/hooks/use-is-electron';

const escapeShellPath = (filePath: string): string =>
  filePath.replace(/[ \t\\'"(){}[\]!#$&;`|*?<>~^%]/g, '\\$&');

interface IUseFileDropOptions {
  sendStdin: (data: string) => void;
  focus: () => void;
}

const useFileDrop = ({ sendStdin, focus }: IUseFileDropOptions) => {
  const [showPathInput, setShowPathInput] = useState(false);
  const [droppedFileHint, setDroppedFileHint] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const { files } = e.dataTransfer;
    if (files.length === 0) return;

    const electronAPI = isElectron
      ? (window as unknown as { electronAPI: { getPathForFile: (file: File) => string } }).electronAPI
      : null;

    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const filePath = electronAPI?.getPathForFile(files[i]);
      if (filePath) {
        paths.push(escapeShellPath(filePath));
      }
    }

    if (paths.length > 0) {
      sendStdin(`\x1b[200~${paths.join(' ')}\x1b[201~`);
      focus();
    } else {
      const names = Array.from(files).map((f) => f.name).join(', ');
      setDroppedFileHint(names);
      setShowPathInput(true);
    }
  }, [sendStdin, focus]);

  const handlePathInputSubmit = useCallback((value: string) => {
    setShowPathInput(false);
    setDroppedFileHint('');
    if (value.trim()) {
      const escaped = escapeShellPath(value.trim());
      sendStdin(`\x1b[200~${escaped}\x1b[201~`);
      focus();
    }
  }, [sendStdin, focus]);

  const handlePathInputDismiss = useCallback(() => {
    setShowPathInput(false);
    setDroppedFileHint('');
    focus();
  }, [focus]);

  return {
    showPathInput,
    droppedFileHint,
    handleDragOver,
    handleDrop,
    handlePathInputSubmit,
    handlePathInputDismiss,
  };
};

export default useFileDrop;
