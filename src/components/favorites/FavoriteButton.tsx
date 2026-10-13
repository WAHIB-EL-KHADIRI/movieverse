import { useFavorites } from '../../hooks/useFavorites';
import type { MovieSummary } from '../../types/movie';

interface Props {
  movie: Pick<MovieSummary, 'id' | 'title' | 'posterPath' | 'releaseDate' | 'voteAverage'>;
  /** `icon` = compact heart for cards, `full` = labelled button for the details page. */
  variant?: 'icon' | 'full';
}

export function FavoriteButton({ movie, variant = 'icon' }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(movie.id);
  const heart = (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="fav__heart">
      <path
        d="M12 20.500s-8-4.900-8-11a4.500 4.500 0 0 1 8-2.700 4.500 4.500 0 0 1 8 2.700c0 6.100-8 11-8 11z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === 'full') {
    return (
      <button
        type="button"
        className={`btn ${active ? 'btn--active' : 'btn--primary'}`}
        aria-pressed={active}
        onClick={() => toggleFavorite(movie)}
      >
        {heart}
        {active ? 'Remove from Favorites' : 'Add to Favorites'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`fav ${active ? 'fav--active' : ''}`}
      aria-pressed={active}
      aria-label={active ? `Remove ${movie.title} from favorites` : `Add ${movie.title} to favorites`}
      onClick={() => toggleFavorite(movie)}
    >
      {heart}
    </button>
  );
}
