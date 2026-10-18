import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { fetchMovieDetails, isAbortError } from '../services/tmdb';
import type { MovieDetails } from '../types/movie';

interface Result {
  attemptId: string;
  movie: MovieDetails | null;
  error: unknown;
}

export interface MovieDetailsState {
  movie: MovieDetails | null;
  loading: boolean;
  error: unknown;
  retry: () => void;
}

export function useMovieDetails(id: string): MovieDetailsState {
  const { tmdbLanguage: language } = useI18n();
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const attemptId = `${id}|${language}|${nonce}`;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetchMovieDetails(id, controller.signal, language)
      .then((movie) => {
        if (!cancelled) setResult({ attemptId, movie, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled && !isAbortError(error)) setResult({ attemptId, movie: null, error });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, language, attemptId]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const current = result?.attemptId === attemptId ? result : null;

  return { movie: current?.movie ?? null, loading: !current, error: current?.error ?? null, retry };
}
