import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../components/feedback/ErrorState';
import { DetailsSkeleton } from '../components/feedback/LoadingSkeleton';
import { FavoriteButton } from '../components/favorites/FavoriteButton';
import { Poster } from '../components/movies/Poster';
import { Rating } from '../components/movies/Rating';
import { useMovieDetails } from '../hooks/useMovieDetails';
import { TmdbError, errorMessage, isValidMovieId } from '../services/tmdb';
import { backdropUrl, formatReleaseDate, formatRuntime } from '../utils/format';

export function MovieDetailsPage() {
  const { movieId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { movie, loading, error, retry } = useMovieDetails(movieId);

  useEffect(() => {
    document.title = movie ? `${movie.title} · MovieVerse` : 'MovieVerse';
    return () => {
      document.title = 'MovieVerse';
    };
  }, [movie]);

  const canGoBack = location.key !== 'default';
  const back = (
    <button type="button" className="btn btn--ghost" onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}>
      ← Back
    </button>
  );

  if (!isValidMovieId(movieId)) {
    return (
      <ErrorState title="Invalid movie ID" message={`“${movieId}” is not a valid movie ID.`}>
        <Link to="/" className="btn btn--primary">
          Browse trending movies
        </Link>
      </ErrorState>
    );
  }

  if (loading) return <DetailsSkeleton />;

  if (error || !movie) {
    const notFound = error instanceof TmdbError && error.kind === 'not-found';
    return (
      <ErrorState
        title={notFound ? 'Movie not found' : 'Couldn’t load this movie'}
        message={notFound ? 'This movie does not exist or was removed from TMDB.' : errorMessage(error)}
        onRetry={notFound ? undefined : retry}
      >
        {back}
      </ErrorState>
    );
  }

  const bg = backdropUrl(movie.backdropPath);

  return (
    <article className="details" aria-labelledby="movie-title">
      {bg && <img className="details__bg" src={bg} alt="" decoding="async" />}
      <div className="details__shade" />
      <div className="details__inner">
        <div className="details__poster">
          <Poster path={movie.posterPath} title={movie.title} size="w500" priority />
        </div>
        <div className="details__body">
          <div>{back}</div>
          <h1 id="movie-title" className="details__title">
            {movie.title}
          </h1>
          {movie.tagline && <p className="details__tagline">{movie.tagline}</p>}
          <ul className="facts">
            <li>
              <Rating value={movie.voteAverage} votes={movie.voteCount} />
              {movie.voteCount > 0 && <span className="muted"> ({movie.voteCount.toLocaleString('en-US')} votes)</span>}
            </li>
            <li>{formatRuntime(movie.runtime)}</li>
            <li>{formatReleaseDate(movie.releaseDate)}</li>
          </ul>
          {movie.genres.length > 0 && (
            <ul className="genres" aria-label="Genres">
              {movie.genres.map((g) => (
                <li key={g.id} className="chip">
                  {g.name}
                </li>
              ))}
            </ul>
          )}
          <h2 className="details__subtitle">Overview</h2>
          <p className="details__overview">{movie.overview || 'No overview available for this movie.'}</p>
          <FavoriteButton movie={movie} variant="full" />
        </div>
      </div>
    </article>
  );
}
