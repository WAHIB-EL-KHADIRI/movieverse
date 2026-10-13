import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FavoritesContext } from '../../hooks/useFavorites';
import type { FavoritesContextValue } from '../../hooks/useFavorites';
import type { FavoriteMovie } from '../../types/movie';
import { FAVORITES_STORAGE_KEY, loadFavorites, saveFavorites } from '../../utils/storage';

/**
 * Single source of truth for favourites. Every page reads from this context, so the heart
 * button is always in sync. Also follows changes made in other tabs via the `storage` event.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteMovie[]>(loadFavorites);
  const [persistent, setPersistent] = useState(true);
  const latest = useRef(favorites);

  const commit = useCallback((next: FavoriteMovie[]) => {
    latest.current = next;
    setFavorites(next);
    setPersistent(saveFavorites(next));
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== FAVORITES_STORAGE_KEY) return;
      const next = loadFavorites();
      latest.current = next;
      setFavorites(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleFavorite = useCallback<FavoritesContextValue['toggleFavorite']>(
    (movie) => {
      const current = latest.current;
      if (current.some((f) => f.id === movie.id)) {
        commit(current.filter((f) => f.id !== movie.id));
      } else {
        commit([
          {
            id: movie.id,
            title: movie.title,
            posterPath: movie.posterPath,
            releaseDate: movie.releaseDate,
            voteAverage: movie.voteAverage,
            addedAt: Date.now(),
          },
          ...current,
        ]);
      }
    },
    [commit],
  );

  const removeFavorite = useCallback((id: number) => commit(latest.current.filter((f) => f.id !== id)), [commit]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isFavorite: (id) => favorites.some((f) => f.id === id),
      toggleFavorite,
      removeFavorite,
      persistent,
    }),
    [favorites, persistent, toggleFavorite, removeFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
