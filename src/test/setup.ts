import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { clearTmdbCache } from '../services/tmdb';
import { requestLog, server } from './server';

// jsdom suites run in parallel workers; keep async assertions tolerant of a loaded CI machine.
configure({ asyncUtilTimeout: 4000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => {
  vi.stubEnv('VITE_TMDB_API_KEY', 'test-key');
  clearTmdbCache();
  requestLog.length = 0;
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());
