import { describe, expect, it, vi } from 'vitest';
import { CONTENT_SECURITY_POLICY, renderNetlifyHeaders } from './securityHeaders';
import { createTmdbProxy } from './tmdbProxy';
import type { ProxyOptions } from './tmdbProxy';

const KEY = '0123456789abcdef0123456789abcdef';
const ORIGIN = 'https://movieverse.example';

function setup(overrides: Partial<ProxyOptions> = {}) {
  const upstream = vi.fn<typeof fetch>(async () => Response.json({ page: 1, results: [] }));
  const log = vi.fn();
  const handle = createTmdbProxy({ apiKey: KEY, fetchImpl: upstream, log, ...overrides });
  const get = (path: string, init: RequestInit = {}, ip = '1.1.1.1') => handle(new Request(`${ORIGIN}${path}`, init), ip);
  const upstreamUrl = (i = 0) => new URL(String(upstream.mock.calls[i]![0]));
  return { handle, get, upstream, upstreamUrl, log };
}

const body = async (r: Response) => (await r.json()) as Record<string, unknown>;

describe('TMDB proxy — key handling', () => {
  it('attaches a v3 key server-side and never echoes it', async () => {
    const { get, upstreamUrl } = setup();
    const res = await get('/api/tmdb/trending/movie/week?page=2&language=fr-FR');
    expect(res.status).toBe(200);
    expect(upstreamUrl().origin + upstreamUrl().pathname).toBe('https://api.themoviedb.org/3/trending/movie/week');
    expect(upstreamUrl().searchParams.get('api_key')).toBe(KEY);
    const text = await res.text();
    expect(text).not.toContain(KEY);
    res.headers.forEach((v) => expect(v).not.toContain(KEY));
  });

  it('sends a v4 token as a Bearer header, not in the URL', async () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
    const { get, upstream, upstreamUrl } = setup({ apiKey: token });
    await get('/api/tmdb/genre/movie/list');
    expect(upstreamUrl().searchParams.has('api_key')).toBe(false);
    const headers = upstream.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${token}`);
  });

  it.each([undefined, '', '  ', 'your_tmdb_v3_api_key_here'])('returns a config error when the key is %j', async (apiKey) => {
    const { get, upstream } = setup({ apiKey });
    const res = await get('/api/tmdb/trending/movie/week');
    expect(res.status).toBe(500);
    expect(await body(res)).toEqual({ error: 'config' });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('hides upstream auth failures behind a 502 and logs without the key', async () => {
    const { get, log } = setup({ fetchImpl: async () => new Response('{"status_code":7}', { status: 401 }) });
    const res = await get('/api/tmdb/trending/movie/week');
    expect(res.status).toBe(502);
    expect(await body(res)).toEqual({ error: 'upstream_auth' });
    expect(JSON.stringify(log.mock.calls)).not.toContain(KEY);
  });
});

describe('TMDB proxy — request validation', () => {
  it.each([
    '/api/tmdb/search/movie?query=alien&page=1&include_adult=false&language=ar',
    '/api/tmdb/discover/movie?page=3&sort_by=vote_average.desc&vote_count.gte=200&with_genres=18&primary_release_year=1999',
    '/api/tmdb/discover/movie?vote_average.gte=6.5&vote_count.gte=1000&primary_release_date.lte=2026-11-25',
    '/api/tmdb/movie/550?append_to_response=videos,credits,similar&language=fr-FR&include_video_language=fr,en,null',
    '/api/tmdb/genre/movie/list?language=en-US',
  ])('allows %s', async (path) => {
    const { get } = setup();
    expect((await get(path)).status).toBe(200);
  });

  it.each([
    ['unknown endpoint', '/api/tmdb/account', 404],
    ['other TMDB resource', '/api/tmdb/person/1', 404],
    ['path traversal', '/api/tmdb/movie/1/../../account', 404],
    ['encoded traversal', '/api/tmdb/movie/1%2F..%2Faccount', 404],
    ['non-numeric id', '/api/tmdb/movie/abc', 404],
    ['outside prefix', '/api/other/trending/movie/week', 404],
    ['unknown param', '/api/tmdb/trending/movie/week?api_key=attacker', 400],
    ['session param', '/api/tmdb/movie/1?session_id=x', 400],
    ['adult content', '/api/tmdb/search/movie?query=x&include_adult=true', 400],
    ['duplicated param', '/api/tmdb/trending/movie/week?page=1&page=2', 400],
    ['page out of range', '/api/tmdb/trending/movie/week?page=501', 400],
    ['page zero', '/api/tmdb/trending/movie/week?page=0', 400],
    ['bad sort', '/api/tmdb/discover/movie?sort_by=revenue.desc', 400],
    ['bad language', '/api/tmdb/genre/movie/list?language=en-US%0d%0aX:1', 400],
    ['missing query', '/api/tmdb/search/movie?page=1', 400],
    ['blank query', '/api/tmdb/search/movie?query=%20%20', 400],
    ['oversized query', `/api/tmdb/search/movie?query=${'a'.repeat(101)}`, 400],
    ['control chars', '/api/tmdb/search/movie?query=a%00b', 400],
    ['bad append', '/api/tmdb/movie/1?append_to_response=account_states', 400],
  ])('rejects %s', async (_name, path, status) => {
    const { get, upstream } = setup();
    expect((await get(path)).status).toBe(status);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each(['POST', 'PUT', 'DELETE'])('rejects %s', async (method) => {
    const { get } = setup();
    const res = await get('/api/tmdb/trending/movie/week', { method });
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET, HEAD');
  });

  it('blocks cross-site browser requests but allows same-origin ones', async () => {
    const { get } = setup();
    const cross = await get('/api/tmdb/trending/movie/week', { headers: { 'sec-fetch-site': 'cross-site' } });
    expect(cross.status).toBe(403);
    const same = await get('/api/tmdb/trending/movie/week', { headers: { 'sec-fetch-site': 'same-origin' } });
    expect(same.status).toBe(200);
  });

  it('never sends CORS headers', async () => {
    const { get } = setup();
    const res = await get('/api/tmdb/trending/movie/week', { headers: { Origin: 'https://evil.example' } });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('TMDB proxy — caching', () => {
  it('serves repeat requests from memory and normalises parameter order', async () => {
    const { get, upstream } = setup();
    const a = await get('/api/tmdb/discover/movie?page=1&sort_by=popularity.desc');
    const b = await get('/api/tmdb/discover/movie?sort_by=popularity.desc&page=1');
    expect(a.headers.get('X-Proxy-Cache')).toBe('MISS');
    expect(b.headers.get('X-Proxy-Cache')).toBe('HIT');
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('expires entries after the TTL', async () => {
    let t = 0;
    const { get, upstream } = setup({ now: () => t, cache: { ttlMs: 1000, maxEntries: 10 } });
    await get('/api/tmdb/genre/movie/list');
    t = 1001;
    await get('/api/tmdb/genre/movie/list');
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('bounds memory with maxEntries', async () => {
    const { get, upstream } = setup({ cache: { ttlMs: 60_000, maxEntries: 2 } });
    for (const p of [1, 2, 3, 1]) await get(`/api/tmdb/trending/movie/week?page=${p}`);
    expect(upstream).toHaveBeenCalledTimes(4); // page 1 was evicted by page 3
  });

  it('sets CDN cache headers on success and no-store on errors', async () => {
    const { get } = setup();
    const ok = await get('/api/tmdb/genre/movie/list');
    expect(ok.headers.get('Netlify-CDN-Cache-Control')).toContain('s-maxage=');
    expect(ok.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const bad = await get('/api/tmdb/nope');
    expect(bad.headers.get('Cache-Control')).toBe('no-store');
  });

  it('does not cache failures', async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ genres: [] }));
    const { get } = setup({ fetchImpl: upstream });
    expect((await get('/api/tmdb/genre/movie/list')).status).toBe(502);
    expect((await get('/api/tmdb/genre/movie/list')).status).toBe(200);
  });
});

describe('TMDB proxy — rate limiting', () => {
  it('limits each client per window and recovers after it', async () => {
    let t = 0;
    const { get } = setup({ now: () => t, cache: false, rateLimit: { max: 3, windowMs: 10_000 } });
    for (let i = 1; i <= 3; i++) expect((await get(`/api/tmdb/trending/movie/week?page=${i}`)).status).toBe(200);
    const limited = await get('/api/tmdb/trending/movie/week?page=4');
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('10');
    expect((await get('/api/tmdb/trending/movie/week?page=4', {}, '2.2.2.2')).status).toBe(200); // other client
    t = 10_000;
    expect((await get('/api/tmdb/trending/movie/week?page=4')).status).toBe(200);
  });

  it('relays upstream 429 with Retry-After', async () => {
    const { get } = setup({ fetchImpl: async () => new Response('', { status: 429, headers: { 'Retry-After': '7' } }) });
    const res = await get('/api/tmdb/trending/movie/week');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('7');
  });
});

describe('TMDB proxy — upstream failures', () => {
  it('maps timeouts to 504', async () => {
    const { get } = setup({
      fetchImpl: () => Promise.reject(Object.assign(new Error('t'), { name: 'TimeoutError' })),
    });
    expect((await get('/api/tmdb/trending/movie/week')).status).toBe(504);
  });

  it('maps network errors to 502', async () => {
    const { get } = setup({ fetchImpl: () => Promise.reject(new TypeError('fetch failed')) });
    expect((await get('/api/tmdb/trending/movie/week')).status).toBe(502);
  });

  it('never relays non-JSON bodies', async () => {
    const { get } = setup({ fetchImpl: async () => new Response('<script>alert(1)</script>', { status: 200 }) });
    const res = await get('/api/tmdb/trending/movie/week');
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('<script>');
  });

  it('passes 404 through', async () => {
    const { get } = setup({ fetchImpl: async () => new Response('{}', { status: 404 }) });
    expect((await get('/api/tmdb/movie/999999999')).status).toBe(404);
  });
});

describe('security headers', () => {
  it('ships a strict CSP', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-inline');
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("connect-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  });

  it('renders Netlify _headers with security and immutable asset caching', () => {
    const file = renderNetlifyHeaders();
    for (const h of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy']) {
      expect(file).toContain(h);
    }
    expect(file).toMatch(/\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
  });
});
