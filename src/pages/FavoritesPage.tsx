import { useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { MovieGrid } from '../components/movies/MovieGrid';
import { useFavorites } from '../hooks/useFavorites';
import { FAVORITE_SORT_LABELS, favoriteStats, filterAndSortFavorites } from '../utils/favorites';
import type { FavoriteSort } from '../utils/favorites';
import { parseFavorites, serializeFavorites } from '../utils/storage';

const SORTS = Object.keys(FAVORITE_SORT_LABELS) as FavoriteSort[];
const MAX_IMPORT_BYTES = 1_000_000;

function downloadJson(text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'movieverse-favorites.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function FavoritesPage() {
  const { favorites, removeFavorite, importFavorites, persistent } = useFavorites();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<FavoriteSort>('recent');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const sortId = useId();

  const visible = filterAndSortFavorites(favorites, search, sort);
  const stats = favoriteStats(favorites);

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage({ ok: false, text: 'That file is too large to be a MovieVerse export.' });
      return;
    }
    const items = parseFavorites(await file.text());
    if (items.length === 0) {
      setMessage({ ok: false, text: 'No valid favorites found in that file.' });
      return;
    }
    const added = importFavorites(items);
    setMessage({
      ok: true,
      text: added > 0 ? `Imported ${added} new favorite${added === 1 ? '' : 's'}.` : 'Nothing new: all of those are already in your favorites.',
    });
  };

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

      {favorites.length > 0 && (
        <>
          <dl className="stats" aria-label="Favorites statistics">
            <div className="stat">
              <dt>Movies</dt>
              <dd>{stats.count}</dd>
            </div>
            <div className="stat">
              <dt>Average rating</dt>
              <dd>{stats.averageRating === null ? '—' : stats.averageRating.toFixed(1)}</dd>
            </div>
            <div className="stat">
              <dt>Years covered</dt>
              <dd>{stats.yearRange ? (stats.yearRange[0] === stats.yearRange[1] ? stats.yearRange[0] : `${stats.yearRange[0]}–${stats.yearRange[1]}`) : '—'}</dd>
            </div>
          </dl>

          <div className="filters fav-tools">
            <div className="field field--grow">
              <label htmlFor={searchId}>Find in favorites</label>
              <input id={searchId} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title…" />
            </div>
            <div className="field">
              <label htmlFor={sortId}>Sort by</label>
              <select id={sortId} value={sort} onChange={(e) => setSort(e.target.value as FavoriteSort)}>
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {FAVORITE_SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => downloadJson(serializeFavorites(favorites))}>
              Export
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              Import
            </button>
          </div>
        </>
      )}

      {/* Import also works from the empty state, so the file input lives outside the list. */}
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Import favorites file" onChange={onImport} />

      {message && (
        <p className={message.ok ? 'hint' : 'notice'} role={message.ok ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}

      {favorites.length === 0 ? (
        <EmptyState title="No favorites yet" message="Tap the heart on any movie to save it here, or import a previous export.">
          <Link to="/" className="btn btn--primary">
            Discover movies
          </Link>
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            Import favorites
          </button>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState title="No match" message={`None of your favorites match “${search.trim()}”.`}>
          <button type="button" className="btn btn--ghost" onClick={() => setSearch('')}>
            Clear search
          </button>
        </EmptyState>
      ) : (
        <MovieGrid movies={visible} onRemove={removeFavorite} label="Favorite movies" />
      )}
    </section>
  );
}
