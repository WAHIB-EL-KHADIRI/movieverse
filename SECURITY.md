# Security Policy

MovieVerse is a frontend-only app. It has no backend and stores no user data
on any server; favorites and preferences live in the visitor's own browser
(`localStorage`). The only network calls are to the public TMDB API.

Note that `VITE_TMDB_API_KEY` is embedded in the built JavaScript by design
(see the README). Use a dedicated TMDB key and never reuse one that matters.

## Reporting a vulnerability

Please report it privately through GitHub private vulnerability reporting:
<https://github.com/WAHIB-EL-KHADIRI/movieverse/security/advisories/new>

Do not open a public issue for a security problem.
