import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { SECURITY_HEADERS, renderNetlifyHeaders } from './securityHeaders';
import { PROXY_PREFIX, createTmdbProxy } from './tmdbProxy';

type Next = (err?: unknown) => void;

/**
 * - dev / preview: serves `/api/tmdb/*` through the same proxy as production (key stays in Node).
 * - preview: also applies the production security headers, so CSP can be tested locally.
 * - build: emits Netlify `_headers` and fails if the TMDB key ended up in any output file.
 */
export function movieversePlugin(apiKey: string | undefined): Plugin {
  const handle = createTmdbProxy({ apiKey, rateLimit: false });

  const proxy = async (req: IncomingMessage, res: ServerResponse, next: Next) => {
    if (!req.url?.startsWith(`${PROXY_PREFIX}/`)) return next();
    try {
      const headers = new Headers();
      const site = req.headers['sec-fetch-site'];
      if (typeof site === 'string') headers.set('sec-fetch-site', site);
      const response = await handle(
        new Request(new URL(req.url, 'http://localhost'), { method: req.method, headers }),
        req.socket.remoteAddress,
      );
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      next(error);
    }
  };

  return {
    name: 'movieverse',
    configureServer(server) {
      server.middlewares.use(proxy);
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
        next();
      });
      server.middlewares.use(proxy);
    },
    generateBundle(_options, bundle) {
      this.emitFile({ type: 'asset', fileName: '_headers', source: renderNetlifyHeaders() });
      const key = apiKey?.trim();
      if (!key || key.length < 16) return;
      for (const [name, item] of Object.entries(bundle)) {
        const text = item.type === 'chunk' ? item.code : typeof item.source === 'string' ? item.source : '';
        if (text.includes(key)) this.error(`TMDB API key found in build output "${name}". Refusing to ship it.`);
      }
    },
  };
}
