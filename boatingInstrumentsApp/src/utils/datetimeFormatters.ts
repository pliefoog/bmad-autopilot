/**
 * Timezone-aware datetime formatters for ConversionRegistry
 * 
 * Converts Unix timestamp (milliseconds) to formatted date/time strings
 * with timezone offset support.
 * 
 * **Architecture:**
 * - formatTime(): Converts timestamp to time string (24h/12h/compact)
 * - formatDate(): Converts timestamp to date string (nautical/ISO/US/EU/UK)
 * - Timezone handling: UTC, auto-detect, or custom offset
 * - Unit labels include timezone (UTC, UTC+2, LOCAL)
 */

export interface DateTimeOptions {
  timezoneOffset?: number; // Hours from UTC (-12 to +14)
  forceUTC?: boolean;      // Force UTC display (overrides offset)
}

/**
 * Format timestamp as time string
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @param format - Time format ID (time_24h_full, time_12h, etc.)
 * @param options - Timezone options
 * @returns Formatted time and unit label
 */
export function formatTime(
  timestamp: number,
  format: string,
  options: DateTimeOptions = {}
): { formatted: string; unitLabel: string } {
  // Determine effective timezone offset
  let offset = 0;
  if (options.forceUTC) {
    offset = 0;
  } else if (options.timezoneOffset !== undefined) {
    offset = options.timezoneOffset;
  } else {
    // Auto-detect device timezone
    offset = -new Date().getTimezoneOffset() / 60;
  }
  
  // Apply timezone offset
  const adjustedTime = new Date(timestamp + offset * 3600000);
  
  // Extract time components
  const hours = adjustedTime.getUTCHours();
  const minutes = adjustedTime.getUTCMinutes();
  const seconds = adjustedTime.getUTCSeconds();
  
  let formatted: string;
  switch (format) {
    case 'time_24h_full':
      formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      break;
    case 'time_24h':
      formatted = `${pad(hours)}:${pad(minutes)}`;
      break;
    case 'time_12h':
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      formatted = `${pad(hours12)}:${pad(minutes)} ${ampm}`;
      break;
    case 'time_12h_full':
      const hours12Full = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampmFull = hours >= 12 ? 'PM' : 'AM';
      formatted = `${pad(hours12Full)}:${pad(minutes)}:${pad(seconds)} ${ampmFull}`;
      break;
    case 'time_compact':
      formatted = `${pad(hours)}.${pad(minutes)}`;
      break;
    default:
      formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  
  // Generate unit label
  const unitLabel = offset === 0 ? 'UTC' : `UTC${offset >= 0 ? '+' : ''}${offset}`;
  
  return { formatted, unitLabel };
}

/**
 * Format timestamp as date string
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @param format - Date format ID (nautical_date, iso_date, etc.)
 * @param options - Timezone options
 * @returns Formatted date and unit label
 */
export function formatDate(
  timestamp: number,
  format: string,
  options: DateTimeOptions = {}
): { formatted: string; unitLabel: string } {
  // Apply timezone offset (same logic as formatTime)
  let offset = 0;
  if (options.forceUTC) {
    offset = 0;
  } else if (options.timezoneOffset !== undefined) {
    offset = options.timezoneOffset;
  } else {
    offset = -new Date().getTimezoneOffset() / 60;
  }
  
  const adjustedTime = new Date(timestamp + offset * 3600000);
  
  const year = adjustedTime.getUTCFullYear();
  const month = adjustedTime.getUTCMonth();
  const day = adjustedTime.getUTCDate();
  const dayOfWeek = adjustedTime.getUTCDay();
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let formatted: string;
  switch (format) {
    case 'nautical_date':
      formatted = `${dayNames[dayOfWeek]} ${monthNames[month]} ${pad(day)}, ${year}`;
      break;
    case 'iso_date':
      formatted = `${year}-${pad(month + 1)}-${pad(day)}`;
      break;
    case 'us_date':
      formatted = `${pad(month + 1)}/${pad(day)}/${year}`;
      break;
    case 'eu_date':
      formatted = `${pad(day)}.${pad(month + 1)}.${year}`;
      break;
    case 'uk_date':
      formatted = `${pad(day)}/${pad(month + 1)}/${year}`;
      break;
    default:
      formatted = `${dayNames[dayOfWeek]} ${monthNames[month]} ${pad(day)}, ${year}`;
  }
  
  const unitLabel = offset === 0 ? 'UTC' : `UTC${offset >= 0 ? '+' : ''}${offset}`;
  
  return { formatted, unitLabel };
}

/**
 * Pad number with leading zero
 */
function pad(num: number): string {
  return num.toString().padStart(2, '0');
}
