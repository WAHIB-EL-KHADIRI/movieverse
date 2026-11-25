import { createTmdbProxy } from '../../server/tmdbProxy';

/** Server-side TMDB proxy. The key lives only in the Netlify env var TMDB_API_KEY. */
const handle = createTmdbProxy({ apiKey: process.env.TMDB_API_KEY });

export default (request: Request, context: { ip?: string }) => handle(request, context.ip);

export const config = {
  path: '/api/tmdb/*',
  // Platform-enforced, per visitor IP. CDN-cached responses don't count against it.
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
