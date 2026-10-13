export function formatRuntime(minutes: number | null): string {
  if (!minutes || minutes <= 0) return 'Runtime unknown';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function getYear(date: string): string {
  return /^\d{4}/.test(date) ? date.slice(0, 4) : '';
}

export function formatReleaseDate(date: string): string {
  const t = Date.parse(date);
  if (Number.isNaN(t)) return 'Release date unknown';
  return new Date(t).toLocaleDateString('en-US', {
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

export function backdropUrl(path: string | null, size: BackdropSize = 'w1280'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
