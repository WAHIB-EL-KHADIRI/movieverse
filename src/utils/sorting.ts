import type { MovieSummary, SortOption } from '../types/movie';

export const SORT_LABELS: Record<SortOption, string> = {
  default: 'Default',
  popularity: 'Popularity',
  rating: 'Rating',
  release: 'Release date',
};

const finite = (n: number): number => (Number.isFinite(n) ? n : 0);

/** Missing dates sort last in descending order. */
const dateValue = (m: MovieSummary): number => {
  const t = Date.parse(m.releaseDate);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
};

/**
 * Returns a new array sorted descending by the chosen key.
 * `default` keeps the API order. Ties keep their original order (stable sort).
 * NOTE: this only orders the movies passed in (i.e. the pages loaded so far).
 */
export function sortMovies(movies: readonly MovieSummary[], sort: SortOption): MovieSummary[] {
  const copy = [...movies];
  switch (sort) {
    case 'popularity':
      return copy.sort((a, b) => finite(b.popularity) - finite(a.popularity));
    case 'rating':
      // Unrated films (0 votes) must not float to the top with a bogus 0/10 vs 10/10 tie.
      return copy.sort(
        (a, b) =>
          Number(b.voteCount > 0) - Number(a.voteCount > 0) ||
          finite(b.voteAverage) - finite(a.voteAverage),
      );
    case 'release':
      return copy.sort((a, b) => {
        const da = dateValue(a);
        const db = dateValue(b);
        if (da === db) return 0;
        return db > da ? 1 : -1;
      });
    default:
      return copy;
  }
}
