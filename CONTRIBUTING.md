# Contributing

Thanks for your interest in MovieVerse. Bug reports, fixes and small
improvements are welcome.

## Setup

Requires Node.js >= 20.19 and a free TMDB v3 API key (see the README).

```bash
npm install
cp .env.example .env   # then add your own VITE_TMDB_API_KEY
npm run dev
```

Never commit `.env` or a real API key.

## Before opening a pull request

Run the same checks as CI:

```bash
npm run check   # typecheck, lint, test, build
```

- Keep changes focused; one concern per pull request.
- Add or update tests for behavior changes (Vitest + React Testing Library + MSW).
- New user-facing strings go in all three dictionaries in `src/i18n/translations.ts` (a test checks that the keys match).
- Open a pull request against `main`; do not push to it directly.

## Security issues

Do not file them as public issues. See [SECURITY.md](SECURITY.md).
