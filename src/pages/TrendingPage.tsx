import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { MovieGridSkeleton } from '../components/feedback/LoadingSkeleton';
import { FilterBar } from '../components/filters/FilterBar';
import { Hero } from '../components/movies/Hero';
import { MovieGrid } from '../components/movies/MovieGrid';
import { SearchBar } from '../components/search/SearchBar';
import { useDebounce } from '../hooks/useDebounce';
import { useGenres } from '../hooks/useGenres';
import { useMovieList } from '../hooks/useMovieList';
import { errorMessage } from '../services/tmdb';
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

  const reset = () => update({ year: '', sort: '', genre: '' });
  const clearAll = () => {
    setText('');
    setParams({}, { replace: true });
  };

  const heading = searching ? `Results for “${urlQuery.trim()}”` : isDefaultView ? 'Trending this week' : 'Browse movies';

  return (
    <>
      {heroMovies.length > 0 && <Hero movies={heroMovies} />}

      <section className="toolbar" aria-label="Search and filters">
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
          {year && <span className="chip">Year: {year}</span>}
          {genreName && <span className="chip">Genre: {genreName}</span>}
        </div>
        {searching && sort !== 'default' && (
          <p className="hint">Search results are sorted among the movies loaded so far. Load more to extend the ordering.</p>
        )}

        {status === 'loading' && <MovieGridSkeleton />}

        {status === 'error' && <ErrorState message={errorMessage(error)} onRetry={retry} />}

        {status === 'empty' && (
          <EmptyState
            title="No movies found"
            message={
              searching
                ? `Nothing matches “${urlQuery.trim()}”${year ? ` in ${year}` : ''}. Try a different title or remove the year filter.`
                : 'No movies match these filters.'
            }
          >
            {hasMore && (
              <button type="button" className="btn btn--ghost" onClick={loadMore}>
                Load more results
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={clearAll}>
              Clear search &amp; filters
            </button>
          </EmptyState>
        )}

        {movies.length > 0 && (
          <>
            <MovieGrid movies={movies} label={heading} />
            <div className="load-more">
              {status === 'error-more' && <ErrorState title="Couldn’t load more" message={errorMessage(error)} onRetry={retry} />}
              {status === 'loading-more' && (
                <button type="button" className="btn btn--ghost" disabled>
                  Loading…
                </button>
              )}
              {(status === 'success') &&
                (hasMore ? (
                  <button type="button" className="btn btn--ghost" onClick={loadMore}>
                    Load more
                  </button>
                ) : (
                  <p className="hint">You’ve reached the end of the results.</p>
                ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
