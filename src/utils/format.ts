export interface RuntimeLabels {
  h: string;
  m: string;
  unknown: string;
}

const EN_RUNTIME: RuntimeLabels = { h: 'h', m: 'm', unknown: 'Runtime unknown' };

export function formatRuntime(minutes: number | null, labels: RuntimeLabels = EN_RUNTIME): string {
  if (!minutes || minutes <= 0) return labels.unknown;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}${labels.m}`;
  return m === 0 ? `${h}${labels.h}` : `${h}${labels.h} ${m}${labels.m}`;
}

export function getYear(date: string): string {
  return /^\d{4}/.test(date) ? date.slice(0, 4) : '';
}

export function formatReleaseDate(date: string, locale = 'en-US', unknown = 'Release date unknown'): string {
  const t = Date.parse(date);
  if (Number.isNaN(t)) return unknown;
  return new Date(t).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatRating(vote: number, count?: number): string {
  if (count === 0 || !Number.isFinite(vote) || vote <= 0) return 'NR';
  return vote.toFixed(1);
}

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w185' | 'w342' | 'w500';
export type BackdropSize = 'w780' | 'w1280';

export function posterUrl(path: string | null, size: PosterSize = 'w342'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function profileUrl(path: string | null): string | null {
  return path ? `${IMAGE_BASE}/w185${path}` : null;
}

export function backdropUrl(path: string | null, size: BackdropSize = 'w1280'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
