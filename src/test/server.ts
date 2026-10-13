import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { RAW_DETAILS, RAW_MOVIES } from './fixtures';
import type { RawFixture } from './fixtures';

export const API = 'https://api.themoviedb.org/3';

/** Every request the app made (path + query without api_key), for call-count assertions. */
export const requestLog: string[] = [];

const page = (results: RawFixture[]) => ({ page: 1, total_pages: 1, total_results: results.length, results });

const SORT_FIELDS: Record<string, (m: RawFixture) => number | string> = {
  'popularity.desc': (m) => m.popularity,
  'vote_average.desc': (m) => m.vote_average,
  'primary_release_date.desc': (m) => m.release_date,
};

export const handlers = [
  http.get(`${API}/trending/movie/week`, ({ request }) => {
    requestLog.push(logEntry(request));
    return HttpResponse.json(page(RAW_MOVIES));
  }),

  http.get(`${API}/search/movie`, async ({ request }) => {
    requestLog.push(logEntry(request));
    const url = new URL(request.url);
    const q = (url.searchParams.get('query') ?? '').toLowerCase();
    const year = url.searchParams.get('primary_release_year');
    // "slow…" queries answer late so tests can provoke out-of-order responses.
    if (q.startsWith('slow')) await delay(300);
    const results = RAW_MOVIES.filter(
      (m) => m.title.toLowerCase().includes(q) && (!year || m.release_date.startsWith(year)),
    );
    return HttpResponse.json(page(results));
  }),

  http.get(`${API}/discover/movie`, ({ request }) => {
    requestLog.push(logEntry(request));
    const url = new URL(request.url);
    const year = url.searchParams.get('primary_release_year');
    const sortBy = url.searchParams.get('sort_by') ?? 'popularity.desc';
    const key = SORT_FIELDS[sortBy] ?? SORT_FIELDS['popularity.desc']!;
    const results = RAW_MOVIES.filter((m) => !year || m.release_date.startsWith(year)).sort((a, b) =>
      key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0,
    );
    return HttpResponse.json(page(results));
  }),

  http.get(`${API}/movie/:id`, ({ request, params }) => {
    requestLog.push(logEntry(request));
    if (params.id === String(RAW_DETAILS.id)) return HttpResponse.json(RAW_DETAILS);
    const other = RAW_MOVIES.find((m) => String(m.id) === params.id);
    if (other) return HttpResponse.json({ ...other, runtime: 90, tagline: '', genres: [{ id: 18, name: 'Drama' }] });
    return HttpResponse.json({ status_code: 34, status_message: 'Not found' }, { status: 404 });
  }),
];

function logEntry(request: Request): string {
  const url = new URL(request.url);
  url.searchParams.delete('api_key');
  return `${url.pathname.replace('/3', '')}${url.search}`;
}

export const server = setupServer(...handlers);
