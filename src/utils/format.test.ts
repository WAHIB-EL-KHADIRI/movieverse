import { describe, expect, it } from 'vitest';
import { formatRating, formatReleaseDate, formatRuntime, getYear, posterUrl } from './format';

describe('format helpers', () => {
  it('formats runtime in hours and minutes', () => {
    expect(formatRuntime(135)).toBe('2h 15m');
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(45)).toBe('45m');
    expect(formatRuntime(null)).toBe('Runtime unknown');
    expect(formatRuntime(0)).toBe('Runtime unknown');
  });

  it('formats ratings and flags unrated movies', () => {
    expect(formatRating(7.256, 10)).toBe('7.3');
    expect(formatRating(0, 0)).toBe('NR');
    expect(formatRating(NaN)).toBe('NR');
  });

  it('formats dates without timezone drift and handles missing dates', () => {
    expect(formatReleaseDate('2023-05-10')).toBe('May 10, 2023');
    expect(formatReleaseDate('')).toBe('Release date unknown');
    expect(getYear('2023-05-10')).toBe('2023');
    expect(getYear('')).toBe('');
  });

  it('builds image URLs only when a path exists', () => {
    expect(posterUrl('/a.jpg', 'w185')).toBe('https://image.tmdb.org/t/p/w185/a.jpg');
    expect(posterUrl(null)).toBeNull();
  });
});
