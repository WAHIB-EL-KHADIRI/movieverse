import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { clearTmdbCache } from '../services/tmdb';
import { requestLog, server } from './server';

// jsdom suites run in parallel workers; keep async assertions tolerant of a loaded CI machine.
configure({ asyncUtilTimeout: 4000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => {
  window.scrollTo = vi.fn(); // not implemented in jsdom
  clearTmdbCache();
  requestLog.length = 0;
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
