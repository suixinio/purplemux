export const TOAST_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

export type TToastPosition = (typeof TOAST_POSITIONS)[number];

export const isValidToastPosition = (value: unknown): value is TToastPosition =>
  typeof value === 'string' && (TOAST_POSITIONS as readonly string[]).includes(value);
