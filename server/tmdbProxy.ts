/**
 * Server-side TMDB proxy.
 *
 * The browser never sees the TMDB credential: it calls `/api/tmdb/<path>` on our own
 * origin and this handler forwards an allow-listed, validated subset of requests to
 * TMDB with the key attached server-side.
 *
 * Runtime-agnostic (web `Request` → `Response`): used by the Netlify Function in
 * production and by the Vite dev/preview middleware locally, so both enforce the
 * exact same rules.
 */

export const PROXY_PREFIX = '/api/tmdb';
const UPSTREAM = 'https://api.themoviedb.org/3';

type Validator = (value: string) => boolean;

const re = (pattern: RegExp): Validator => (v) => pattern.test(v);
const oneOf =
  (...values: string[]): Validator =>
  (v) => values.includes(v);

const page: Validator = (v) => /^[1-9]\d{0,2}$/.test(v) && Number(v) <= 500;
const year = re(/^\d{4}$/);
const language = re(/^[a-z]{2}(-[A-Z]{2})?$/);
const noAdult = oneOf('false');
// Free text: bounded length, no control characters.
// eslint-disable-next-line no-control-regex
const searchText: Validator = (v) => v.trim().length > 0 && v.length <= 100 && !/[\u0000-\u001f\u007f]/.test(v);

interface Route {
  pattern: RegExp;
  params: Record<string, Validator>;
  required?: string[];
}

/** The only TMDB endpoints and query parameters the app is allowed to use. */
const ROUTES: Route[] = [
  { pattern: /^\/trending\/movie\/week$/, params: { page, language } },
  {
    pattern: /^\/search\/movie$/,
    params: { query: searchText, page, primary_release_year: year, include_adult: noAdult, language },
    required: ['query'],
  },
  {
    pattern: /^\/discover\/movie$/,
    params: {
      page,
      language,
      include_adult: noAdult,
      sort_by: oneOf('popularity.desc', 'vote_average.desc', 'primary_release_date.desc'),
      primary_release_year: year,
      with_genres: re(/^\d{1,6}$/),
      'vote_count.gte': re(/^\d{1,5}$/),
      'vote_average.gte': re(/^\d(\.\d)?$/),
      'primary_release_date.lte': re(/^\d{4}-\d{2}-\d{2}$/),
    },
  },
  { pattern: /^\/genre\/movie\/list$/, params: { language } },
  {
    pattern: /^\/movie\/[1-9]\d{0,9}$/,
    params: {
      language,
      append_to_response: oneOf('videos,credits,similar'),
      include_video_language: re(/^[a-z]{2},en,null$/),
    },
  },
];

export type ProxyErrorCode =
  | 'config'
  | 'method_not_allowed'
  | 'forbidden'
  | 'not_found'
  | 'bad_request'
  | 'rate_limited'
  | 'upstream_auth'
  | 'upstream_error'
  | 'timeout';

export interface ProxyOptions {
  /** TMDB v3 API key, or a v4 read access token (sent as a Bearer token). */
  apiKey: string | undefined;
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** Per-client fixed-window limit. Best-effort per instance; the platform limit is the hard one. */
  rateLimit?: { max: number; windowMs: number } | false;
  cache?: { ttlMs: number; maxEntries: number } | false;
  upstreamTimeoutMs?: number;
  log?: (event: Record<string, unknown>) => void;
}

const SUCCESS_CACHE_HEADERS = {
  // Browsers: short. Netlify CDN: shared across all visitors, so most traffic never reaches TMDB.
  'Cache-Control': 'public, max-age=300',
  'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=3600, stale-while-revalidate=86400',
};

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      ...extra,
    },
  });
}

const fail = (status: number, error: ProxyErrorCode, extra?: Record<string, string>) => json(status, { error }, extra);

/** Returns the upstream path + canonical query, or an error response. */
export function validateRequest(url: URL): { path: string; query: URLSearchParams } | Response {
  if (!url.pathname.startsWith(`${PROXY_PREFIX}/`)) return fail(404, 'not_found');
  const path = url.pathname.slice(PROXY_PREFIX.length);
  const route = ROUTES.find((r) => r.pattern.test(path));
  if (!route) return fail(404, 'not_found');
  if (url.search.length > 512) return fail(400, 'bad_request');

  const query = new URLSearchParams();
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    const validate = route.params[key];
    if (!validate || values.length !== 1 || !validate(values[0]!)) return fail(400, 'bad_request');
    query.set(key, values[0]!);
  }
  if (route.required?.some((k) => !query.has(k))) return fail(400, 'bad_request');
  query.sort(); // canonical order → better cache hit rate
  return { path, query };
}

export function createTmdbProxy(options: ProxyOptions) {
  const {
    fetchImpl = fetch,
    now = Date.now,
    rateLimit = { max: 60, windowMs: 60_000 },
    cache = { ttlMs: 5 * 60_000, maxEntries: 500 },
    upstreamTimeoutMs = 8_000,
    log = (event) => console.error(JSON.stringify({ source: 'tmdb-proxy', ...event })),
  } = options;
  const apiKey = options.apiKey?.trim();

  const hits = new Map<string, { windowStart: number; count: number }>();
  const store = new Map<string, { at: number; body: string }>();

  function limited(client: string): number | null {
    if (!rateLimit) return null;
    const t = now();
    const entry = hits.get(client);
    if (!entry || t - entry.windowStart >= rateLimit.windowMs) {
      if (hits.size >= 10_000) hits.clear(); // bound memory under IP churn
      hits.set(client, { windowStart: t, count: 1 });
      return null;
    }
    entry.count += 1;
    return entry.count > rateLimit.max ? Math.ceil((entry.windowStart + rateLimit.windowMs - t) / 1000) : null;
  }

  return async function handle(request: Request, clientIp = 'unknown'): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fail(405, 'method_not_allowed', { Allow: 'GET, HEAD' });
    }
    // Other websites can't read our responses (no CORS headers), but block them from
    // spending our TMDB quota through their visitors' browsers too.
    if (request.headers.get('sec-fetch-site') === 'cross-site') return fail(403, 'forbidden');

    const validated = validateRequest(new URL(request.url));
    if (validated instanceof Response) return validated;
    const { path, query } = validated;

    if (!apiKey || apiKey === 'your_tmdb_v3_api_key_here') {
      log({ level: 'error', event: 'missing_api_key' });
      return fail(500, 'config');
    }

    const cacheKey = `${path}?${query.toString()}`;
    const cached = cache ? store.get(cacheKey) : undefined;
    if (cache && cached && now() - cached.at < cache.ttlMs) {
      return new Response(cached.body, {
        status: 200,
        headers: { ...JSON_HEADERS, ...SUCCESS_CACHE_HEADERS, 'X-Proxy-Cache': 'HIT' },
      });
    }

    const retryAfter = limited(clientIp);
    if (retryAfter !== null) return fail(429, 'rate_limited', { 'Retry-After': String(retryAfter) });

    // v4 read access tokens are JWTs; v3 keys are 32 hex chars.
    const isBearer = apiKey.startsWith('eyJ');
    const upstreamQuery = new URLSearchParams(query);
    if (!isBearer) upstreamQuery.set('api_key', apiKey);

    let upstream: Response;
    try {
      upstream = await fetchImpl(`${UPSTREAM}${path}?${upstreamQuery.toString()}`, {
        headers: { Accept: 'application/json', ...(isBearer ? { Authorization: `Bearer ${apiKey}` } : {}) },
        signal: AbortSignal.timeout(upstreamTimeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      log({ level: 'error', event: timedOut ? 'upstream_timeout' : 'upstream_network', path });
      return timedOut ? fail(504, 'timeout') : fail(502, 'upstream_error');
    }

    if (!upstream.ok) {
      const s = upstream.status;
      log({ level: s === 401 ? 'error' : 'warn', event: 'upstream_status', status: s, path });
      if (s === 401) return fail(502, 'upstream_auth');
      if (s === 404) return fail(404, 'not_found');
      if (s === 429) return fail(429, 'rate_limited', { 'Retry-After': upstream.headers.get('Retry-After') ?? '10' });
      return fail(502, 'upstream_error');
    }

    let body: string;
    try {
      body = await upstream.text();
      JSON.parse(body); // never relay a non-JSON body under a JSON content type
    } catch {
      log({ level: 'error', event: 'upstream_invalid_json', path });
      return fail(502, 'upstream_error');
    }

    if (cache) {
      if (store.size >= cache.maxEntries) store.delete(store.keys().next().value!);
      store.set(cacheKey, { at: now(), body });
    }
    return new Response(body, {
      status: 200,
      headers: { ...JSON_HEADERS, ...SUCCESS_CACHE_HEADERS, 'X-Proxy-Cache': 'MISS' },
    });
  };
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};
