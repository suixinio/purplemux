import dayjs from 'dayjs';
import type { TPeriod } from '@/types/stats';

export const getPeriodRange = (period: TPeriod): { start: Date; end: Date } => {
  const end = new Date();

  switch (period) {
    case 'today':
      return { start: dayjs().startOf('day').toDate(), end };
    case '7d':
      return { start: dayjs().subtract(7, 'day').startOf('day').toDate(), end };
    case '30d':
      return { start: dayjs().subtract(30, 'day').startOf('day').toDate(), end };
    case 'all':
      return { start: new Date(0), end };
  }
};

export const isWithinPeriod = (timestamp: string | number | Date, period: TPeriod): boolean => {
  if (period === 'all') return true;

  const { start, end } = getPeriodRange(period);
  const date = new Date(timestamp);
  return date >= start && date <= end;
};

export const isDateStringWithinPeriod = (dateStr: string, period: TPeriod): boolean => {
  if (period === 'all') return true;

  const { start, end } = getPeriodRange(period);
  const date = dayjs(dateStr).toDate();
  return date >= start && date <= end;
};

export const parsePeriod = (value: string | undefined): TPeriod => {
  if (value === 'today' || value === '7d' || value === '30d' || value === 'all') return value;
  return 'all';
};
