import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { MovieGridSkeleton } from '../components/feedback/LoadingSkeleton';
import { FilterBar } from '../components/filters/FilterBar';
import { Hero } from '../components/movies/Hero';
import { MovieGrid } from '../components/movies/MovieGrid';
import { SearchBar } from '../components/search/SearchBar';
import { useDebounce } from '../hooks/useDebounce';
import { useGenres } from '../hooks/useGenres';
import { useI18n } from '../i18n/useI18n';
import { useMovieList } from '../hooks/useMovieList';
import { fetchRandomMovie } from '../services/tmdb';
import type { SortOption } from '../types/movie';

export const SEARCH_DEBOUNCE_MS = 400;
const SORTS: SortOption[] = ['default', 'popularity', 'rating', 'release'];

const parseSort = (v: string | null): SortOption => (SORTS.includes(v as SortOption) ? (v as SortOption) : 'default');
const parseYear = (v: string | null): string => (v && /^\d{4}$/.test(v) ? v : '');
const parseGenre = (v: string | null): string => (v && /^\d{1,6}$/.test(v) ? v : '');

/**
 * Filters live in the URL (?q=&year=&sort=) so that going to a movie and pressing Back
 * restores exactly what the user was looking at, and views can be shared.
 */
export function TrendingPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, errorText, tmdbLanguage } = useI18n();
  const [surprise, setSurprise] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const urlQuery = params.get('q') ?? '';
  const year = parseYear(params.get('year'));
  const sort = parseSort(params.get('sort'));
  const genre = parseGenre(params.get('genre'));
  const genres = useGenres();
  const genreName = genres.find((g) => String(g.id) === genre)?.name;

  const [text, setText] = useState(urlQuery);
  const debounced = useDebounce(text, SEARCH_DEBOUNCE_MS);

  const update = (changes: Record<string, string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      },
      { replace: true },
    );

  // Only the debounced text reaches the URL (and therefore the API).
  useEffect(() => {
    if (debounced.trim() !== urlQuery.trim()) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (debounced.trim()) next.set('q', debounced.trim());
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    }
  }, [debounced, urlQuery, setParams]);

  const { movies, status, error, hasMore, loadMore, retry } = useMovieList({ query: urlQuery, year, sort, genre });
  const searching = urlQuery.trim().length > 0;
  const pendingSearch = text.trim() !== urlQuery.trim();
  const isDefaultView = !searching && !year && !genre && sort === 'default';
  const heroMovies = isDefaultView ? movies.filter((m) => m.backdropPath).slice(0, 5) : [];

  const surpriseMe = async () => {
    setSurprise({ busy: true, error: null });
    try {
      const movie = await fetchRandomMovie(undefined, tmdbLanguage);
      navigate(`/movie/${movie.id}`);
    } catch (e) {
      setSurprise({ busy: false, error: errorText(e) });
    }
  };

  const reset = () => update({ year: '', sort: '', genre: '' });
  const clearAll = () => {
    setText('');
    setParams({}, { replace: true });
  };

  const heading = searching
    ? t('trending.results', { q: urlQuery.trim() })
    : isDefaultView
      ? t('trending.title')
      : t('trending.browse');

  return (
    <>
      {heroMovies.length > 0 && <Hero movies={heroMovies} />}

      <section className="toolbar" aria-label={t('trending.toolbar')}>
        <SearchBar value={text} onChange={setText} busy={pendingSearch || (searching && status === 'loading')} />
        <FilterBar
          year={year}
          sort={sort}
          genre={genre}
          genres={genres}
          searching={searching}
          onGenreChange={(g) => update({ genre: g })}
          onYearChange={(y) => update({ year: y })}
          onSortChange={(s) => update({ sort: s === 'default' ? '' : s })}
          onReset={reset}
        />
      </section>

      <section aria-labelledby="list-title">
        <div className="section-head">
          <h1 id="list-title" className="section-title">
            {heading}
          </h1>
          {year && <span className="chip">{t('chip.year', { y: year })}</span>}
          {genreName && <span className="chip">{t('chip.genre', { g: genreName })}</span>}
          <button type="button" className="btn btn--ghost surprise" onClick={surpriseMe} disabled={surprise.busy}>
            {surprise.busy ? t('surprise.busy') : t('surprise.button')}
          </button>
        </div>
        {surprise.error && (
          <p className="notice" role="alert">
            {surprise.error}
          </p>
        )}
        {searching && sort !== 'default' && (
          <p className="hint">{t('trending.sortHint')}</p>
        )}

        {status === 'loading' && <MovieGridSkeleton />}

        {status === 'error' && <ErrorState message={errorText(error)} onRetry={retry} />}

        {status === 'empty' && (
          <EmptyState
            title={t('empty.title')}
            message={
              searching
                ? t(year ? 'empty.searchYear' : 'empty.searchNoYear', { q: urlQuery.trim(), y: year })
                : t('empty.filters')
            }
          >
            {hasMore && (
              <button type="button" className="btn btn--ghost" onClick={loadMore}>
                {t('list.loadMoreResults')}
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={clearAll}>
              {t('list.clearAll')}
            </button>
          </EmptyState>
        )}

        {movies.length > 0 && (
          <>
            <MovieGrid movies={movies} label={heading} />
            <div className="load-more">
              {status === 'error-more' && <ErrorState title={t('list.moreFailed')} message={errorText(error)} onRetry={retry} />}
              {status === 'loading-more' && (
                <button type="button" className="btn btn--ghost" disabled>
                  {t('list.loading')}
                </button>
              )}
              {(status === 'success') &&
                (hasMore ? (
                  <button type="button" className="btn btn--ghost" onClick={loadMore}>
                    {t('list.loadMore')}
                  </button>
                ) : (
                  <p className="hint">{t('list.end')}</p>
                ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
