/**
 * Date/time parsing utilities for --since option
 */

function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function toISOStringWithTZ(date: Date): string {
  return date.toISOString();
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function parseSinceOption(since: string): { start: string; end?: string } {
  const now = new Date();

  // Pattern: lastNNmin
  const minMatch = since.match(/^last(\d+)min$/i);
  if (minMatch) {
    const minutes = parseInt(minMatch[1], 10);
    const start = new Date(now.getTime() - minutes * 60 * 1000);
    return { start: toISOStringWithTZ(start) };
  }

  // Pattern: lastNNhours
  const hourMatch = since.match(/^last(\d+)hours?$/i);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return { start: toISOStringWithTZ(start) };
  }

  // Pattern: lastNNdays
  const dayMatch = since.match(/^last(\d+)days?$/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { start: toISOStringWithTZ(start) };
  }

  // Pattern: yesterday
  if (since.toLowerCase() === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      start: toISOStringWithTZ(getStartOfDay(yesterday)),
      end: toISOStringWithTZ(getEndOfDay(yesterday)),
    };
  }

  // Pattern: today
  if (since.toLowerCase() === 'today') {
    return {
      start: toISOStringWithTZ(getStartOfDay(now)),
    };
  }

  // Assume ISO string
  const parsed = new Date(since);
  if (isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid --since value: "${since}". Use formats like: last60min, last6hours, yesterday, today, last7days, or an ISO date string.`
    );
  }
  return { start: parsed.toISOString() };
}

export { getLocalTimeZone };
