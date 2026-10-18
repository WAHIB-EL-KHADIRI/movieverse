import { Link } from 'react-router-dom';
import type { FavoriteMovie } from '../../types/movie';
import { formatReleaseDate } from '../../utils/format';
import { FavoriteButton } from '../favorites/FavoriteButton';
import { Poster } from './Poster';
import { Rating } from './Rating';

/** Works for both API results and stored favourites. */
type CardMovie = Omit<FavoriteMovie, 'addedAt'> & { voteCount?: number; overview?: string };

interface Props {
  movie: CardMovie;
  /** Show a "remove" control instead of the heart toggle (Favorites page). */
  onRemove?: (id: number) => void;
  priority?: boolean;
}

export function MovieCard({ movie, onRemove, priority }: Props) {
  return (
    <article className="movie-card">
      <Link to={`/movie/${movie.id}`} className="movie-card__link" aria-label={`${movie.title} — view details`}>
        <div className="movie-card__poster">
          <Poster path={movie.posterPath} title={movie.title} priority={priority} />
          {movie.overview && (
            <div className="movie-card__overlay" aria-hidden="true">
              <p>{movie.overview}</p>
            </div>
          )}
          <div className="movie-card__score">
            <Rating value={movie.voteAverage} votes={movie.voteCount} variant="ring" />
          </div>
        </div>
        <div className="movie-card__info">
          <h3 className="movie-card__title">{movie.title}</h3>
          <div className="movie-card__meta">
            <time dateTime={movie.releaseDate || undefined}>{formatReleaseDate(movie.releaseDate)}</time>
          </div>
        </div>
      </Link>
      {onRemove ? (
        <button
          type="button"
          className="fav fav--remove"
          aria-label={`Remove ${movie.title} from favorites`}
          onClick={() => onRemove(movie.id)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.500" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <FavoriteButton movie={movie} />
      )}
    </article>
  );
}
