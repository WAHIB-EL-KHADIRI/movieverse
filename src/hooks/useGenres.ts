import { useEffect, useState } from 'react';
import { fetchGenres, isAbortError } from '../services/tmdb';
import type { Genre } from '../types/movie';

/** Loads the genre list once. On failure the list stays empty and the genre filter is simply hidden. */
export function useGenres(): Genre[] {
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchGenres(controller.signal)
      .then(setGenres)
      .catch((error: unknown) => {
        if (!isAbortError(error)) setGenres([]);
      });
    return () => controller.abort();
  }, []);

  return genres;
}
