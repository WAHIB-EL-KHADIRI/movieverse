import { Link } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { MovieGrid } from '../components/movies/MovieGrid';
import { useFavorites } from '../hooks/useFavorites';

export function FavoritesPage() {
  const { favorites, removeFavorite, persistent } = useFavorites();

  return (
    <section aria-labelledby="fav-title">
      <div className="section-head">
        <h1 id="fav-title" className="section-title">
          Your favorites
        </h1>
        {favorites.length > 0 && <span className="chip">{favorites.length} saved</span>}
      </div>

      {!persistent && (
        <p className="notice" role="alert">
          Your browser blocked saving to local storage, so favorites will be lost when you close this tab.
        </p>
      )}

      {favorites.length === 0 ? (
        <EmptyState title="No favorites yet" message="Tap the heart on any movie to save it here.">
          <Link to="/" className="btn btn--primary">
            Discover movies
          </Link>
        </EmptyState>
      ) : (
        <MovieGrid movies={favorites} onRemove={removeFavorite} label="Favorite movies" />
      )}
    </section>
  );
}
