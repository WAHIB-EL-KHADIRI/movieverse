import type { FavoriteMovie } from '../../types/movie';
import { MovieCard } from './MovieCard';

type GridMovie = Omit<FavoriteMovie, 'addedAt'> & { voteCount?: number };

interface Props {
  movies: readonly GridMovie[];
  onRemove?: (id: number) => void;
  label: string;
}

export function MovieGrid({ movies, onRemove, label }: Props) {
  return (
    <ul className="movie-grid" aria-label={label}>
      {movies.map((movie, i) => (
        <li key={movie.id}>
          <MovieCard movie={movie} onRemove={onRemove} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
