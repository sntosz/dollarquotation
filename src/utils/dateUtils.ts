import { parseISO, subMonths, setDate, isWeekend, subDays, format, isValid } from 'date-fns';

/**
 * Checks if a given date is a weekend (Saturday or Sunday).
 */
export function isWeekendDay(date: Date): boolean {
  return isWeekend(date);
}

/**
 * Given a date, if it falls on a weekend, returns the previous Friday.
 * Otherwise returns the same date.
 */
export function getPreviousBusinessDayIfWeekend(date: Date): Date {
  let cur = new Date(date);
  while (isWeekend(cur)) {
    cur = subDays(cur, 1);
  }
  return cur;
}

/**
 * Formats date to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formats date to MM-DD-YYYY for BCB Olinda OData API
 */
export function formatDateBCB(date: Date): string {
  return format(date, 'MM-dd-yyyy');
}

/**
 * Formats date to YYYYMMDD for AwesomeAPI
 */
export function formatDateAwesome(date: Date): string {
  return format(date, 'yyyyMMdd');
}

/**
 * For Carnê-Leão / IRPF rules:
 * Returns the 15th day of the previous month for a given event date (or year/month string YYYY-MM).
 * For example:
 * Event date in October 2026 (2026-10-15) -> Previous month is September 2026 -> 15th of September 2026.
 */
export function getFirstFortnightEndDateOfPreviousMonth(eventDate: Date | string): Date {
  const dateObj = typeof eventDate === 'string' ? parseISO(eventDate) : eventDate;
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }

  // Go to previous month
  const prevMonth = subMonths(dateObj, 1);
  // Set day to 15th
  const fifteenth = setDate(prevMonth, 15);
  // Get business day on or before 15th if weekend
  return getPreviousBusinessDayIfWeekend(fifteenth);
}
