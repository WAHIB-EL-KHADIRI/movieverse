import type { CSSProperties } from 'react';
import type { FavoriteMovie } from '../../types/movie';
import { MovieCard } from './MovieCard';

type GridMovie = Omit<FavoriteMovie, 'addedAt'> & { voteCount?: number; overview?: string };

interface Props {
  movies: readonly GridMovie[];
  onRemove?: (id: number) => void;
  label: string;
}

export function MovieGrid({ movies, onRemove, label }: Props) {
  return (
    <ul className="movie-grid" aria-label={label}>
      {movies.map((movie, i) => (
        // --i staggers the entrance animation (capped so late items don't wait forever).
        <li key={movie.id} style={{ '--i': Math.min(i, 14) } as CSSProperties}>
          <MovieCard movie={movie} onRemove={onRemove} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
