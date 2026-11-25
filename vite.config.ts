/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { movieversePlugin } from './server/vitePlugin';

export default defineConfig(({ mode }) => {
  // '' prefix → also loads non-VITE_ vars. TMDB_API_KEY is read here, in Node only;
  // it is never exposed through import.meta.env.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  if (env.VITE_TMDB_API_KEY && mode !== 'test') {
    throw new Error(
      'VITE_TMDB_API_KEY is no longer supported: VITE_* variables are bundled into public JavaScript. ' +
        'Rename it to TMDB_API_KEY in .env (local) and in Netlify environment variables (production).',
    );
  }

  return {
    plugins: [react(), movieversePlugin(env.TMDB_API_KEY)],
    build: { sourcemap: false },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
      testTimeout: 15_000,
    },
  };
});
