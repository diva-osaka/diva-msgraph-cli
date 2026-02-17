import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseSinceOption } from '../../src/utils/date';

describe('parseSinceOption', () => {
  const FIXED_NOW = new Date('2025-06-15T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('last60min should return 60 minutes ago', () => {
    const result = parseSinceOption('last60min');
    const expected = new Date(FIXED_NOW.getTime() - 60 * 60 * 1000).toISOString();
    expect(result.start).toBe(expected);
    expect(result.end).toBeUndefined();
  });

  it('last6hours should return 6 hours ago', () => {
    const result = parseSinceOption('last6hours');
    const expected = new Date(FIXED_NOW.getTime() - 6 * 60 * 60 * 1000).toISOString();
    expect(result.start).toBe(expected);
    expect(result.end).toBeUndefined();
  });

  it('last1hour should return 1 hour ago (singular form)', () => {
    const result = parseSinceOption('last1hour');
    const expected = new Date(FIXED_NOW.getTime() - 1 * 60 * 60 * 1000).toISOString();
    expect(result.start).toBe(expected);
    expect(result.end).toBeUndefined();
  });

  it('last7days should return 7 days ago', () => {
    const result = parseSinceOption('last7days');
    const expected = new Date(FIXED_NOW.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(result.start).toBe(expected);
    expect(result.end).toBeUndefined();
  });

  it('last1day should return 1 day ago (singular form)', () => {
    const result = parseSinceOption('last1day');
    const expected = new Date(FIXED_NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(result.start).toBe(expected);
    expect(result.end).toBeUndefined();
  });

  it('yesterday should return start and end of yesterday', () => {
    const result = parseSinceOption('yesterday');
    const yesterday = new Date(FIXED_NOW);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);

    expect(result.start).toBe(startOfDay.toISOString());
    expect(result.end).toBe(endOfDay.toISOString());
  });

  it('today should return start of today', () => {
    const result = parseSinceOption('today');
    const startOfToday = new Date(FIXED_NOW);
    startOfToday.setHours(0, 0, 0, 0);

    expect(result.start).toBe(startOfToday.toISOString());
    expect(result.end).toBeUndefined();
  });

  it('ISO string should be returned as-is', () => {
    const isoString = '2025-01-10T09:00:00.000Z';
    const result = parseSinceOption(isoString);
    expect(result.start).toBe(isoString);
    expect(result.end).toBeUndefined();
  });

  it('invalid value should throw an error', () => {
    expect(() => parseSinceOption('invalidvalue')).toThrow(
      /Invalid --since value/
    );
  });

  it('empty string should throw an error', () => {
    expect(() => parseSinceOption('')).toThrow(
      /Invalid --since value/
    );
  });

  it('case-insensitive matching should work', () => {
    const result = parseSinceOption('Last30Min');
    const expected = new Date(FIXED_NOW.getTime() - 30 * 60 * 1000).toISOString();
    expect(result.start).toBe(expected);
  });
});
