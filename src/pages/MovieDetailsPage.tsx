import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../components/feedback/ErrorState';
import { DetailsSkeleton } from '../components/feedback/LoadingSkeleton';
import { FavoriteButton } from '../components/favorites/FavoriteButton';
import { CastList } from '../components/movies/CastList';
import { MovieGrid } from '../components/movies/MovieGrid';
import { Poster } from '../components/movies/Poster';
import { TrailerPlayer } from '../components/movies/TrailerPlayer';
import { Rating } from '../components/movies/Rating';
import { useMovieDetails } from '../hooks/useMovieDetails';
import { useI18n } from '../i18n/useI18n';
import { TmdbError, isValidMovieId } from '../services/tmdb';
import { backdropUrl, formatReleaseDate, formatRuntime } from '../utils/format';

export function MovieDetailsPage() {
  const { movieId = '' } = useParams();
  const navigate = useNavigate();
  const { t, locale, errorText } = useI18n();
  const location = useLocation();
  const { movie, loading, error, retry } = useMovieDetails(movieId);

  // Opening a "similar movie" reuses this route, so start from the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [movieId]);

  useEffect(() => {
    document.title = movie ? `${movie.title} · MovieVerse` : 'MovieVerse';
    return () => {
      document.title = 'MovieVerse';
    };
  }, [movie]);

  const canGoBack = location.key !== 'default';
  const back = (
    <button type="button" className="btn btn--ghost" onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}>
      {t('details.back')}
    </button>
  );

  if (!isValidMovieId(movieId)) {
    return (
      <ErrorState title={t('details.invalidTitle')} message={t('details.invalidMsg', { id: movieId })}>
        <Link to="/" className="btn btn--primary">
          {t('details.browse')}
        </Link>
      </ErrorState>
    );
  }

  if (loading) return <DetailsSkeleton />;

  if (error || !movie) {
    const notFound = error instanceof TmdbError && error.kind === 'not-found';
    return (
      <ErrorState
        title={notFound ? t('details.notFoundTitle') : t('details.loadFailed')}
        message={notFound ? t('details.notFoundMsg') : errorText(error)}
        onRetry={notFound ? undefined : retry}
      >
        {back}
      </ErrorState>
    );
  }

  const bg = backdropUrl(movie.backdropPath);

  return (
    <>
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
              {movie.voteCount > 0 && <span className="muted"> {t('details.votes', { n: movie.voteCount.toLocaleString(locale) })}</span>}
            </li>
            <li>{formatRuntime(movie.runtime, { h: t('unit.h'), m: t('unit.m'), unknown: t('format.runtimeUnknown') })}</li>
            <li>{formatReleaseDate(movie.releaseDate, locale, t('format.dateUnknown'))}</li>
          </ul>
          {movie.genres.length > 0 && (
            <ul className="genres" aria-label={t('details.genres')}>
              {movie.genres.map((g) => (
                <li key={g.id} className="chip">
                  {g.name}
                </li>
              ))}
            </ul>
          )}
          <h2 className="details__subtitle">{t('details.overview')}</h2>
          <p className="details__overview">{movie.overview || t('details.noOverview')}</p>
          <div className="actions">
            <FavoriteButton movie={movie} variant="full" />
            {movie.trailerKey && <TrailerPlayer videoKey={movie.trailerKey} title={movie.title} />}
          </div>
        </div>
      </div>
    </article>

    <CastList cast={movie.cast} />

    {movie.similar.length > 0 && (
      <section aria-labelledby="similar-title" className="extra">
        <h2 id="similar-title" className="details__subtitle">
          {t('details.similar')}
        </h2>
        <MovieGrid movies={movie.similar} label={t('details.similarLabel')} />
      </section>
    )}
    </>
  );
}
