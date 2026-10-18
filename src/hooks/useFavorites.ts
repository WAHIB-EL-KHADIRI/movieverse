import { createContext, useContext } from 'react';
import type { MovieSummary } from '../types/movie';
import type { FavoriteMovie } from '../types/movie';

export interface FavoritesContextValue {
  favorites: FavoriteMovie[];
  isFavorite: (id: number) => boolean;
  toggleFavorite: (movie: Pick<MovieSummary, 'id' | 'title' | 'posterPath' | 'releaseDate' | 'voteAverage'>) => void;
  removeFavorite: (id: number) => void;
  /** Merges entries (existing ones win, IDs deduplicated). Returns how many were new. */
  importFavorites: (items: FavoriteMovie[]) => number;
  /** False when the last write to localStorage failed (favourites then live only in memory). */
  persistent: boolean;
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return ctx;
}
