# Security Policy

MovieVerse stores no user data on any server; favorites and preferences live in
the visitor's own browser (`localStorage`). The browser only talks to its own
origin (`/api/tmdb/*`), TMDB's image CDN and youtube-nocookie.com (trailers).

The TMDB credential (`TMDB_API_KEY`) exists only in the serverless proxy
environment. The proxy allow-lists endpoints and parameters, rate-limits per IP
and never returns the key. A strict Content-Security-Policy is enforced
(see `server/securityHeaders.ts`).

## Reporting a vulnerability

Please report it privately through GitHub private vulnerability reporting:
<https://github.com/WAHIB-EL-KHADIRI/movieverse/security/advisories/new>

Do not open a public issue for a security problem.
