import type { CastMember, Genre, MovieDetails, MoviePage, MovieSummary, RawMovie, SortOption } from '../types/movie';

const API_BASE = 'https://api.themoviedb.org/3';
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 5 * 60_000;
/** Below this vote count a rating is statistically meaningless (used for "Rating" discover sort). */
const MIN_VOTES_FOR_RATING_SORT = 200;

export type TmdbErrorKind =
  | 'config'
  | 'auth'
  | 'not-found'
  | 'rate-limit'
  | 'timeout'
  | 'network'
  | 'server'
  | 'invalid-response'
  | 'http';

const ERROR_MESSAGES: Record<TmdbErrorKind, string> = {
  config:
    'TMDB API key is missing. Copy .env.example to .env and set VITE_TMDB_API_KEY, then restart the dev server.',
  auth: 'TMDB rejected the API key. Check that VITE_TMDB_API_KEY is a valid v3 key.',
  'not-found': 'We could not find what you were looking for.',
  'rate-limit': 'Too many requests to TMDB. Please wait a moment and try again.',
  timeout: 'The request took too long. Check your connection and try again.',
  network: 'Network error. Check your connection and try again.',
  server: 'TMDB is having trouble right now. Please try again shortly.',
  'invalid-response': 'TMDB returned an unexpected response.',
  http: 'Something went wrong while contacting TMDB.',
};

export class TmdbError extends Error {
  readonly kind: TmdbErrorKind;
  readonly status: number | undefined;

  constructor(kind: TmdbErrorKind, status?: number) {
    super(ERROR_MESSAGES[kind]);
    this.name = 'TmdbError';
    this.kind = kind;
    this.status = status;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function errorMessage(error: unknown): string {
  return error instanceof TmdbError ? error.message : ERROR_MESSAGES.http;
}

/* ---------------------------------------------------------------- request */

const cache = new Map<string, { at: number; value: unknown }>();

export function clearTmdbCache(): void {
  cache.clear();
}

type Params = Record<string, string | number | undefined>;

async function request(path: string, params: Params, signal?: AbortSignal): Promise<unknown> {
  const apiKey = (import.meta.env.VITE_TMDB_API_KEY as string | undefined)?.trim();
  if (!apiKey || apiKey === 'your_tmdb_v3_api_key_here') throw new TmdbError('config');

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') search.set(k, String(v));
  // Cache key deliberately excludes the API key.
  const cacheKey = `${path}?${search.toString()}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  search.set('api_key', apiKey);

  // Abort on the caller's signal OR after the timeout, and tell the two apart.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', onCallerAbort, { once: true });

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}?${search.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      if (timedOut) throw new TmdbError('timeout');
      if (signal?.aborted || isAbortError(error)) throw new DOMException('Aborted', 'AbortError');
      throw new TmdbError('network');
    }

    if (!response.ok) {
      const s = response.status;
      if (s === 401) throw new TmdbError('auth', s);
      if (s === 404) throw new TmdbError('not-found', s);
      if (s === 429) throw new TmdbError('rate-limit', s);
      if (s >= 500) throw new TmdbError('server', s);
      throw new TmdbError('http', s);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      if (timedOut) throw new TmdbError('timeout');
      if (signal?.aborted || isAbortError(error)) throw new DOMException('Aborted', 'AbortError');
      throw new TmdbError('invalid-response');
    }
    cache.set(cacheKey, { at: Date.now(), value: data });
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}

/* ---------------------------------------------------------------- parsing */

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const optStr = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

function parseMovie(raw: unknown): MovieSummary | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as RawMovie;
  if (typeof r.id !== 'number' || !Number.isInteger(r.id) || r.id <= 0) return null;
  const title = str(r.title).trim();
  if (!title) return null;
  return {
    id: r.id,
    title,
    overview: str(r.overview),
    posterPath: optStr(r.poster_path),
    backdropPath: optStr(r.backdrop_path),
    releaseDate: str(r.release_date),
    voteAverage: num(r.vote_average),
    voteCount: num(r.vote_count),
    popularity: num(r.popularity),
    genreIds: Array.isArray(r.genre_ids) ? r.genre_ids.filter((g): g is number => typeof g === 'number') : [],
  };
}

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Keys end up in an iframe URL, so only accept the YouTube id alphabet. */
const YOUTUBE_KEY = /^[\w-]{6,20}$/;

function parseTrailerKey(videos: unknown): string | null {
  const candidates = asArray(asRecord(videos).results)
    .map(asRecord)
    .filter((v) => v.site === 'YouTube' && v.type === 'Trailer' && typeof v.key === 'string' && YOUTUBE_KEY.test(v.key));
  const best = candidates.find((v) => v.official === true) ?? candidates[0];
  return best ? (best.key as string) : null;
}

function parseCast(credits: unknown): CastMember[] {
  return asArray(asRecord(credits).cast)
    .map(asRecord)
    .flatMap((c): CastMember[] =>
      typeof c.id === 'number' && typeof c.name === 'string' && c.name
        ? [{ id: c.id, name: c.name, character: str(c.character), profilePath: optStr(c.profile_path) }]
        : [],
    )
    .slice(0, 12);
}

function parseSimilar(similar: unknown): MovieSummary[] {
  return asArray(asRecord(similar).results)
    .flatMap((m) => {
      const movie = parseMovie(m);
      return movie ? [movie] : [];
    })
    .slice(0, 10);
}

function parseGenres(raw: unknown): Genre[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((g): Genre[] => {
    if (typeof g !== 'object' || g === null) return [];
    const { id, name } = g as { id?: unknown; name?: unknown };
    return typeof id === 'number' && typeof name === 'string' ? [{ id, name }] : [];
  });
}

function parsePage(data: unknown): MoviePage {
  if (typeof data !== 'object' || data === null || !Array.isArray((data as { results?: unknown }).results)) {
    throw new TmdbError('invalid-response');
  }
  const d = data as { page?: unknown; total_pages?: unknown; total_results?: unknown; results: unknown[] };
  const results = d.results.flatMap((r) => {
    const m = parseMovie(r);
    return m ? [m] : [];
  });
  return {
    page: num(d.page) || 1,
    // TMDB caps paging at 500 pages.
    totalPages: Math.min(num(d.total_pages) || 1, 500),
    totalResults: num(d.total_results),
    results,
  };
}

/* ---------------------------------------------------------------- public API */

export interface ListQuery {
  /** Free-text title search. Empty → browse mode. */
  query: string;
  /** 4-digit release year, or empty for any. */
  year: string;
  sort: SortOption;
  page: number;
  /** TMDB genre id as a string, or empty/undefined for any. Browse mode only (see hook for search). */
  genre?: string;
}

const DISCOVER_SORT: Record<Exclude<SortOption, 'default'>, string> = {
  popularity: 'popularity.desc',
  rating: 'vote_average.desc',
  release: 'primary_release_date.desc',
};

/**
 * Strategy:
 *  - query present  → /search/movie (year filtered server-side; sorting is applied client-side
 *    to the loaded results because /search has no sort parameter)
 *  - no query, no year, default sort → /trending/movie/week
 *  - otherwise      → /discover/movie, so year filter AND sort are applied server-side across
 *    the whole catalogue (true global ordering, paginated).
 */
export async function fetchMovies(q: ListQuery, signal?: AbortSignal): Promise<MoviePage> {
  const query = q.query.trim();
  const year = /^\d{4}$/.test(q.year) ? q.year : '';

  if (query) {
    return parsePage(
      await request('/search/movie', { query, page: q.page, primary_release_year: year, include_adult: 'false' }, signal),
    );
  }
  const genre = /^\d{1,6}$/.test(q.genre ?? '') ? (q.genre as string) : '';
  if (!year && !genre && q.sort === 'default') {
    return parsePage(await request('/trending/movie/week', { page: q.page }, signal));
  }
  const sort = q.sort === 'default' ? 'popularity' : q.sort;
  const today = new Date().toISOString().slice(0, 10);
  return parsePage(
    await request(
      '/discover/movie',
      {
        page: q.page,
        sort_by: DISCOVER_SORT[sort],
        primary_release_year: year,
        with_genres: genre,
        include_adult: 'false',
        'vote_count.gte': sort === 'rating' ? MIN_VOTES_FOR_RATING_SORT : undefined,
        // Don't surface unreleased titles when ordering by release date.
        'primary_release_date.lte': sort === 'release' ? today : undefined,
      },
      signal,
    ),
  );
}

/** IDs must be positive safe integers; anything else never reaches the network. */
export function isValidMovieId(id: string | undefined): id is string {
  return !!id && /^[1-9]\d{0,9}$/.test(id);
}

export async function fetchMovieDetails(id: string, signal?: AbortSignal): Promise<MovieDetails> {
  if (!isValidMovieId(id)) throw new TmdbError('not-found');
  // One request returns details + trailer + cast + similar titles (no N+1 calls).
  const data = await request(`/movie/${id}`, { append_to_response: 'videos,credits,similar' }, signal);
  const base = parseMovie(data);
  if (!base) throw new TmdbError('invalid-response');
  const r = data as RawMovie;
  const runtime = num(r.runtime);
  return {
    ...base,
    genres: parseGenres(r.genres),
    runtime: runtime > 0 ? runtime : null,
    tagline: str(r.tagline),
    trailerKey: parseTrailerKey(r.videos),
    cast: parseCast(r.credits),
    similar: parseSimilar(r.similar).filter((m) => m.id !== base.id),
  };
}

export async function fetchGenres(signal?: AbortSignal): Promise<Genre[]> {
  const data = await request('/genre/movie/list', {}, signal);
  return parseGenres(asRecord(data).genres);
}
