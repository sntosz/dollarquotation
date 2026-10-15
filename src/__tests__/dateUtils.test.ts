import { describe, it, expect, vi } from 'vitest';
import { getFirstFortnightEndDateOfPreviousMonth, isWeekendDay } from '../utils/dateUtils';

describe('dateUtils - Carnê-Leão date rules', () => {
  it('calculates 1st fortnight end date of previous month for a weekday (e.g., Oct 2026 -> Sept 15 2026)', () => {
    // 2026-09-15 is a Tuesday
    const result = getFirstFortnightEndDateOfPreviousMonth('2026-10-20');
    expect(result.toISOString().substring(0, 10)).toBe('2026-09-15');
  });

  it('adjusts to previous Friday if 15th of previous month is a Saturday or Sunday', () => {
    // August 15 2026 is a Saturday, so 1st fortnight business end date should be Friday Aug 14 2026
    const result = getFirstFortnightEndDateOfPreviousMonth('2026-09-10');
    expect(result.toISOString().substring(0, 10)).toBe('2026-08-14');
    expect(isWeekendDay(result)).toBe(false);
  });
});
