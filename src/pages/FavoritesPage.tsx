import { useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { MovieGrid } from '../components/movies/MovieGrid';
import { useFavorites } from '../hooks/useFavorites';
import { useI18n } from '../i18n/useI18n';
import { FAVORITE_SORT_LABELS, favoriteStats, filterAndSortFavorites } from '../utils/favorites';
import type { FavoriteSort } from '../utils/favorites';
import { parseFavorites, serializeFavorites } from '../utils/storage';

const SORTS = Object.keys(FAVORITE_SORT_LABELS) as FavoriteSort[];
const MAX_IMPORT_BYTES = 1_000_000;
const SORT_KEYS = {
  recent: 'favsort.recent',
  title: 'favsort.title',
  rating: 'favsort.rating',
  release: 'favsort.release',
} as const;

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
  const { t } = useI18n();
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
      setMessage({ ok: false, text: t('favs.tooLarge') });
      return;
    }
    const items = parseFavorites(await file.text());
    if (items.length === 0) {
      setMessage({ ok: false, text: t('favs.noValid') });
      return;
    }
    const added = importFavorites(items);
    setMessage({
      ok: true,
      text: added === 0 ? t('favs.nothingNew') : added === 1 ? t('favs.imported1') : t('favs.importedN', { n: added }),
    });
  };

  return (
    <section aria-labelledby="fav-title">
      <div className="section-head">
        <h1 id="fav-title" className="section-title">
          {t('favs.title')}
        </h1>
        {favorites.length > 0 && <span className="chip">{t('favs.count', { n: favorites.length })}</span>}
      </div>

      {!persistent && (
        <p className="notice" role="alert">
          {t('favs.blocked')}
        </p>
      )}

      {favorites.length > 0 && (
        <>
          <dl className="stats" aria-label={t('favs.stats')}>
            <div className="stat">
              <dt>{t('favs.statMovies')}</dt>
              <dd>{stats.count}</dd>
            </div>
            <div className="stat">
              <dt>{t('favs.statAvg')}</dt>
              <dd>{stats.averageRating === null ? '—' : stats.averageRating.toFixed(1)}</dd>
            </div>
            <div className="stat">
              <dt>{t('favs.statYears')}</dt>
              <dd>{stats.yearRange ? (stats.yearRange[0] === stats.yearRange[1] ? stats.yearRange[0] : `${stats.yearRange[0]}–${stats.yearRange[1]}`) : '—'}</dd>
            </div>
          </dl>

          <div className="filters fav-tools">
            <div className="field field--grow">
              <label htmlFor={searchId}>{t('favs.find')}</label>
              <input id={searchId} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('favs.findPlaceholder')} />
            </div>
            <div className="field">
              <label htmlFor={sortId}>{t('filters.sortBy')}</label>
              <select id={sortId} value={sort} onChange={(e) => setSort(e.target.value as FavoriteSort)}>
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {t(SORT_KEYS[s])}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => downloadJson(serializeFavorites(favorites))}>
              {t('favs.export')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              {t('favs.import')}
            </button>
          </div>
        </>
      )}

      {/* Import also works from the empty state, so the file input lives outside the list. */}
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label={t('favs.importAria')} onChange={onImport} />

      {message && (
        <p className={message.ok ? 'hint' : 'notice'} role={message.ok ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}

      {favorites.length === 0 ? (
        <EmptyState title={t('favs.emptyTitle')} message={t('favs.emptyMsg')}>
          <Link to="/" className="btn btn--primary">
            {t('favs.discover')}
          </Link>
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            {t('favs.importEmpty')}
          </button>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState title={t('favs.noMatchTitle')} message={t('favs.noMatchMsg', { q: search.trim() })}>
          <button type="button" className="btn btn--ghost" onClick={() => setSearch('')}>
            {t('favs.clearSearch')}
          </button>
        </EmptyState>
      ) : (
        <MovieGrid movies={visible} onRemove={removeFavorite} label={t('favs.listLabel')} />
      )}
    </section>
  );
}
