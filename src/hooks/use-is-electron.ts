const isElectron = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).electronAPI;

export default isElectron;
