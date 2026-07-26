/**
 * Central business date and timezone utility for Peru (America/Lima).
 * Handles conversion of UTC ISO timestamps to Peru local date/time representation.
 */

export const BUSINESS_TIMEZONE = 'America/Lima';

/**
 * Returns grouping key in YYYY-MM-DD format for America/Lima timezone.
 * Example: "2026-07-27T01:29:00.000Z" -> "2026-07-26"
 */
export function formatBusinessDateKey(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Formats a date label for UI in DD/MM/YYYY format for America/Lima timezone.
 * Example: "2026-07-27T01:29:00.000Z" -> "26/07/2026"
 */
export function formatBusinessDateLabel(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats time for UI in HH:mm format (24-hour) for America/Lima timezone.
 * Example: "2026-07-27T01:29:00.000Z" -> "20:29"
 */
export function formatBusinessTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Formats both date and time in America/Lima timezone.
 * Example: "2026-07-27T01:29:00.000Z" -> "26/07/2026 20:29"
 */
export function formatBusinessDateTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const dateStr = formatBusinessDateLabel(dateInput);
  const timeStr = formatBusinessTime(dateInput);
  if (dateStr === '-' || timeStr === '-') return '-';
  return `${dateStr} ${timeStr}`;
}

/**
 * Formats calendar-only date strings (e.g. YYYY-MM-DD debt_due_date)
 * without timezone conversions so the date does not shift backward.
 * Example: "2026-07-31" -> "31/07/2026"
 */
export function formatDateOnly(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const trimmed = dateString.trim();
  if (!trimmed) return '-';

  // If it's a pure YYYY-MM-DD string
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${day}/${month}/${year}`;
  }

  // Fallback to ISO format parsing if full ISO string was passed
  return formatBusinessDateLabel(trimmed);
}

/**
 * Generates ISO boundaries for a given date in Peru timezone (America/Lima).
 * Example: "2026-07-26" -> start: "2026-07-26T00:00:00-05:00", end: "2026-07-26T23:59:59.999-05:00"
 */
export function getPeruDayBounds(dateStr: string): { startIso: string; endIso: string } {
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return {
    startIso: `${cleanDate}T00:00:00-05:00`,
    endIso: `${cleanDate}T23:59:59.999-05:00`,
  };
}
