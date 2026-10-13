import { Link } from 'react-router-dom';
import type { MovieSummary } from '../../types/movie';
import { backdropUrl, getYear } from '../../utils/format';
import { Rating } from './Rating';

export function Hero({ movie }: { movie: MovieSummary }) {
  const bg = backdropUrl(movie.backdropPath);
  return (
    <section className="hero" aria-labelledby="hero-title">
      {bg && <img className="hero__bg" src={bg} alt="" loading="eager" decoding="async" />}
      <div className="hero__shade" />
      <div className="hero__content">
        <p className="eyebrow">#1 trending this week</p>
        <h2 id="hero-title" className="hero__title">
          {movie.title}
        </h2>
        <div className="hero__meta">
          <Rating value={movie.voteAverage} votes={movie.voteCount} />
          {getYear(movie.releaseDate) && <span>{getYear(movie.releaseDate)}</span>}
        </div>
        {movie.overview && <p className="hero__overview">{movie.overview}</p>}
        <Link to={`/movie/${movie.id}`} className="btn btn--primary">
          View details
        </Link>
      </div>
    </section>
  );
}
