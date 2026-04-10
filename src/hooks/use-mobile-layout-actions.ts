import { create } from 'zustand';

interface IMobileLayoutActionsState {
  onSelectWorkspace: ((id: string) => void) | null;
  register: (handlers: {
    onSelectWorkspace: (id: string) => void;
  }) => void;
  unregister: () => void;
}

const useMobileLayoutActions = create<IMobileLayoutActionsState>((set) => ({
  onSelectWorkspace: null,
  register: (handlers) =>
    set({
      onSelectWorkspace: handlers.onSelectWorkspace,
    }),
  unregister: () =>
    set({
      onSelectWorkspace: null,
    }),
}));

export default useMobileLayoutActions;
