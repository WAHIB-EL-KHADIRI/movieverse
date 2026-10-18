import type { FavoriteMovie } from '../types/movie';

export type FavoriteSort = 'recent' | 'title' | 'rating' | 'release';

export const FAVORITE_SORT_LABELS: Record<FavoriteSort, string> = {
  recent: 'Recently added',
  title: 'Title (A–Z)',
  rating: 'Rating',
  release: 'Release date',
};

const time = (date: string): number => {
  const t = Date.parse(date);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
};

/** Case-insensitive title filter + sort. Always returns a new array. */
export function filterAndSortFavorites(
  favorites: readonly FavoriteMovie[],
  search: string,
  sort: FavoriteSort,
): FavoriteMovie[] {
  const needle = search.trim().toLowerCase();
  const list = favorites.filter((f) => !needle || f.title.toLowerCase().includes(needle));
  switch (sort) {
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    case 'rating':
      return list.sort((a, b) => b.voteAverage - a.voteAverage);
    case 'release':
      return list.sort((a, b) => {
        const [ta, tb] = [time(a.releaseDate), time(b.releaseDate)];
        return ta === tb ? 0 : tb > ta ? 1 : -1;
      });
    default:
      return list.sort((a, b) => b.addedAt - a.addedAt);
  }
}

export interface FavoriteStats {
  count: number;
  /** Mean of the non-zero ratings, or null when none are rated. */
  averageRating: number | null;
  /** Earliest and latest release year among favourites with a date. */
  yearRange: [number, number] | null;
}

export function favoriteStats(favorites: readonly FavoriteMovie[]): FavoriteStats {
  const rated = favorites.filter((f) => f.voteAverage > 0);
  const years = favorites.map((f) => Number.parseInt(f.releaseDate.slice(0, 4), 10)).filter((y) => Number.isFinite(y));
  return {
    count: favorites.length,
    averageRating: rated.length ? rated.reduce((sum, f) => sum + f.voteAverage, 0) / rated.length : null,
    yearRange: years.length ? [Math.min(...years), Math.max(...years)] : null,
  };
}
