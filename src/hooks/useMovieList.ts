import { useCallback, useEffect, useState } from 'react';
import { fetchMovies, isAbortError } from '../services/tmdb';
import type { ListQuery } from '../services/tmdb';
import type { MovieSummary, SortOption } from '../types/movie';
import { sortMovies } from '../utils/sorting';

export type ListStatus = 'loading' | 'loading-more' | 'success' | 'empty' | 'error' | 'error-more';

interface Loaded {
  filterKey: string;
  page: number;
  totalPages: number;
  movies: MovieSummary[];
}

interface Failed {
  attemptId: string;
  error: unknown;
}

export interface MovieListState {
  movies: MovieSummary[];
  status: ListStatus;
  error: unknown;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

interface Options {
  query: string;
  year: string;
  sort: SortOption;
  /** TMDB genre id or empty. Server-side when browsing, client-side over loaded results when searching. */
  genre?: string;
}

/**
 * Loads (and paginates) a movie list.
 *
 * Race safety: every effect run owns an AbortController and a `cancelled` flag, so a response
 * for an outdated query is aborted and – even if it still resolves – discarded.
 * State is keyed by the filter, so results of one query can never be shown for another.
 */
export function useMovieList({ query, year, sort, genre = '' }: Options): MovieListState {
  const trimmed = query.trim();
  const searching = trimmed.length > 0;
  // In search mode TMDB can neither sort nor filter by genre, so both happen client-side and must not refetch.
  const fetchSort: SortOption = searching ? 'default' : sort;
  const fetchGenre = searching ? '' : genre;
  const filterKey = JSON.stringify([trimmed, year, fetchSort, fetchGenre]);

  const [requested, setRequested] = useState({ filterKey, page: 1 });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [nonce, setNonce] = useState(0);

  // A different filter implicitly restarts at page 1 without any setState-in-effect.
  const page = requested.filterKey === filterKey ? requested.page : 1;
  const attemptId = `${filterKey}|${page}|${nonce}`;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const request: ListQuery = { query: trimmed, year, sort: fetchSort, page, genre: fetchGenre };

    fetchMovies(request, controller.signal)
      .then((result) => {
        if (cancelled) return;
        setLoaded((prev) => {
          const base = page > 1 && prev?.filterKey === filterKey ? prev.movies : [];
          const known = new Set(base.map((m) => m.id));
          const fresh = result.results.filter((m) => !known.has(m.id));
          return { filterKey, page: result.page, totalPages: result.totalPages, movies: [...base, ...fresh] };
        });
      })
      .catch((error: unknown) => {
        if (cancelled || isAbortError(error)) return;
        setFailed({ attemptId, error });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [trimmed, year, fetchSort, fetchGenre, page, filterKey, attemptId]);

  const current = loaded?.filterKey === filterKey ? loaded : null;
  const failure = failed?.attemptId === attemptId ? failed : null;
  let movies = current ? current.movies : [];
  if (searching) {
    const wanted = Number(genre);
    if (genre) movies = movies.filter((m) => m.genreIds.includes(wanted));
    movies = sortMovies(movies, sort);
  }
  const hasMore = !!current && current.page < current.totalPages;

  let status: ListStatus;
  if (failure) status = current ? 'error-more' : 'error';
  else if ((current?.page ?? 0) < page) status = current ? 'loading-more' : 'loading';
  else status = movies.length === 0 ? 'empty' : 'success';

  const loadMore = useCallback(() => {
    if (current && current.page < current.totalPages) setRequested({ filterKey, page: current.page + 1 });
  }, [current, filterKey]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);

  return { movies, status, error: failure?.error ?? null, hasMore, loadMore, retry };
}
