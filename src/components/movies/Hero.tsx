import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';
import type { MovieSummary } from '../../types/movie';
import { backdropUrl, getYear } from '../../utils/format';
import { Rating } from './Rating';

const ROTATE_MS = 7000;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Auto-rotating spotlight of the top trending movies. Pauses on hover/focus; never rotates for reduced-motion users. */
export function Hero({ movies }: { movies: MovieSummary[] }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = movies.length;
  const movie = movies[index % count];

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  if (!movie) return null;
  const bg = backdropUrl(movie.backdropPath);
  const year = getYear(movie.releaseDate);

  return (
    <section
      className="hero"
      aria-labelledby="hero-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero__slide" key={movie.id}>
        {bg && <img className="hero__bg" src={bg} alt="" loading="eager" decoding="async" />}
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">{t('hero.eyebrow', { n: (index % count) + 1 })}</p>
          <h2 id="hero-title" className="hero__title">
            {movie.title}
          </h2>
          <div className="hero__meta">
            <Rating value={movie.voteAverage} votes={movie.voteCount} />
            {year && <span>{year}</span>}
          </div>
          {movie.overview && <p className="hero__overview">{movie.overview}</p>}
          <Link to={`/movie/${movie.id}`} className="btn btn--primary">
            {t('hero.view')}
          </Link>
        </div>
      </div>
      {count > 1 && (
        <div className="hero__dots" role="group" aria-label={t('hero.choose')}>
          {movies.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={`hero__dot ${i === index % count ? 'is-active' : ''}`}
              aria-label={t('hero.show', { title: m.title })}
              aria-current={i === index % count}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
