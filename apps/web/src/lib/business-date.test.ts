import { describe, it, expect } from 'vitest';
import {
  formatBusinessDateKey,
  formatBusinessDateLabel,
  formatBusinessTime,
  formatBusinessDateTime,
  formatDateOnly,
  getPeruDayBounds,
} from './business-date';

describe('business-date utilities', () => {
  it('correctly converts UTC timestamp 2026-07-27T01:29:00.000Z to Peru local date and time', () => {
    const inputIso = '2026-07-27T01:29:00.000Z';

    const groupKey = formatBusinessDateKey(inputIso);
    const dateLabel = formatBusinessDateLabel(inputIso);
    const timeLabel = formatBusinessTime(inputIso);
    const dateTimeLabel = formatBusinessDateTime(inputIso);

    expect(groupKey).toBe('2026-07-26');
    expect(dateLabel).toBe('26/07/2026');
    expect(timeLabel).toBe('20:29');
    expect(dateTimeLabel).toBe('26/07/2026 20:29');
  });

  it('formats calendar-only date strings without timezone shifts', () => {
    const debtDueDate = '2026-07-31';
    const formatted = formatDateOnly(debtDueDate);
    expect(formatted).toBe('31/07/2026');
  });

  it('generates Peru day ISO boundaries correctly', () => {
    const bounds = getPeruDayBounds('2026-07-26');
    expect(bounds.startIso).toBe('2026-07-26T00:00:00-05:00');
    expect(bounds.endIso).toBe('2026-07-26T23:59:59.999-05:00');
  });
});
