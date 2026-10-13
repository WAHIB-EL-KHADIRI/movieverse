import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { API, requestLog, server } from '../test/server';
import { TmdbError, fetchMovieDetails, fetchMovies, isValidMovieId } from './tmdb';

const base = { query: '', year: '', sort: 'default', page: 1 } as const;

describe('tmdb service', () => {
  it('uses /trending for the default view', async () => {
    const page = await fetchMovies(base);
    expect(requestLog).toEqual(['/trending/movie/week?page=1']);
    expect(page.results.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(page.results[0]).toMatchObject({ title: 'Alpha Rising', posterPath: '/alpha.jpg', voteAverage: 7.2 });
  });

  it('uses /search/movie with the year when a query is present', async () => {
    await fetchMovies({ ...base, query: ' alpha ', year: '2023' });
    expect(requestLog[0]).toContain('/search/movie?');
    expect(requestLog[0]).toContain('query=alpha');
    expect(requestLog[0]).toContain('primary_release_year=2023');
  });

  it.each([
    ['popularity', 'popularity.desc'],
    ['rating', 'vote_average.desc'],
    ['release', 'primary_release_date.desc'],
  ] as const)('sorts "%s" server-side via /discover (%s)', async (sort, sortBy) => {
    await fetchMovies({ ...base, sort });
    expect(requestLog[0]).toContain('/discover/movie?');
    expect(requestLog[0]).toContain(`sort_by=${sortBy}`);
  });

  it('applies a vote-count floor for rating sort and ignores future releases for date sort', async () => {
    await fetchMovies({ ...base, sort: 'rating' });
    await fetchMovies({ ...base, sort: 'release' });
    expect(requestLog[0]).toContain('vote_count.gte=200');
    expect(requestLog[1]).toContain('primary_release_date.lte=');
  });

  it('filters by year through /discover even with the default sort', async () => {
    const page = await fetchMovies({ ...base, year: '2021' });
    expect(requestLog[0]).toContain('/discover/movie?');
    expect(page.results.map((m) => m.id)).toEqual([2]);
  });

  it('ignores a malformed year', async () => {
    await fetchMovies({ ...base, year: 'abc' });
    expect(requestLog[0]).toContain('/trending/');
  });

  it('serves repeated identical requests from the cache', async () => {
    await fetchMovies(base);
    await fetchMovies(base);
    expect(requestLog).toHaveLength(1);
  });

  it('discards malformed items instead of crashing', async () => {
    server.use(
      http.get(`${API}/trending/movie/week`, () =>
        HttpResponse.json({ page: 1, total_pages: 1, results: [{ id: 'x' }, null, { id: 5, title: 'Ok' }, { id: 6, title: '' }] }),
      ),
    );
    const page = await fetchMovies(base);
    expect(page.results.map((m) => m.id)).toEqual([5]);
    expect(page.results[0]).toMatchObject({ posterPath: null, releaseDate: '', voteAverage: 0 });
  });

  it('rejects an unexpected payload shape', async () => {
    server.use(http.get(`${API}/trending/movie/week`, () => HttpResponse.json({ nope: true })));
    await expect(fetchMovies(base)).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it.each([
    [401, 'auth'],
    [404, 'not-found'],
    [429, 'rate-limit'],
    [500, 'server'],
    [418, 'http'],
  ])('maps HTTP %i to "%s"', async (status, kind) => {
    server.use(http.get(`${API}/trending/movie/week`, () => new HttpResponse(null, { status })));
    await expect(fetchMovies(base)).rejects.toMatchObject({ name: 'TmdbError', kind, status });
  });

  it('maps connection failures to "network"', async () => {
    server.use(http.get(`${API}/trending/movie/week`, () => HttpResponse.error()));
    await expect(fetchMovies(base)).rejects.toMatchObject({ kind: 'network' });
  });

  it('throws a config error without calling the network when the API key is missing', async () => {
    vi.stubEnv('VITE_TMDB_API_KEY', '');
    await expect(fetchMovies(base)).rejects.toMatchObject({ kind: 'config' });
    expect(requestLog).toHaveLength(0);
  });

  it('times out slow requests', async () => {
    vi.useFakeTimers();
    try {
      server.use(http.get(`${API}/trending/movie/week`, () => new Promise<Response>(() => {})));
      const result = fetchMovies(base).catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(10_500);
      expect(await result).toMatchObject({ kind: 'timeout' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rethrows an AbortError (not a TmdbError) when the caller aborts', async () => {
    const controller = new AbortController();
    const result = fetchMovies({ ...base, query: 'slow' }, controller.signal).catch((e: unknown) => e);
    controller.abort();
    const error = await result;
    expect(error).not.toBeInstanceOf(TmdbError);
    expect((error as Error).name).toBe('AbortError');
  });

  it('never puts the API key in error messages', async () => {
    server.use(http.get(`${API}/trending/movie/week`, () => new HttpResponse(null, { status: 500 })));
    const error = await fetchMovies(base).catch((e: Error) => e);
    expect((error as Error).message).not.toContain('test-key');
  });
});

describe('movie details', () => {
  it('maps genres, runtime and tagline', async () => {
    const movie = await fetchMovieDetails('1');
    expect(movie).toMatchObject({ id: 1, runtime: 135, tagline: 'It begins.' });
    expect(movie.genres.map((g) => g.name)).toEqual(['Action', 'Science Fiction']);
  });

  it('reports not-found for unknown ids', async () => {
    await expect(fetchMovieDetails('999')).rejects.toMatchObject({ kind: 'not-found' });
  });

  it.each(['abc', '-1', '0', '1.5', '12abc', '', '99999999999', '../x'])('rejects invalid id %j without a request', async (id) => {
    expect(isValidMovieId(id)).toBe(false);
    await expect(fetchMovieDetails(id)).rejects.toMatchObject({ kind: 'not-found' });
    expect(requestLog).toHaveLength(0);
  });
});
