import { useId } from 'react';
import type { Genre, SortOption } from '../../types/movie';
import { SORT_LABELS } from '../../utils/sorting';

const FIRST_YEAR = 1950;

interface Props {
  year: string;
  sort: SortOption;
  /** Selected TMDB genre id, or empty. */
  genre: string;
  genres: Genre[];
  searching: boolean;
  onGenreChange: (genre: string) => void;
  onYearChange: (year: string) => void;
  onSortChange: (sort: SortOption) => void;
  onReset: () => void;
}

const SORT_OPTIONS: SortOption[] = ['default', 'popularity', 'rating', 'release'];

export function FilterBar({ year, sort, genre, genres, searching, onGenreChange, onYearChange, onSortChange, onReset }: Props) {
  const yearId = useId();
  const sortId = useId();
  const genreId = useId();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear + 1 - FIRST_YEAR + 1 }, (_, i) => String(currentYear + 1 - i));
  const dirty = year !== '' || genre !== '' || sort !== 'default';

  return (
    <div className="filters" role="group" aria-label="Filters and sorting">
      <div className="field">
        <label htmlFor={yearId}>Release year</label>
        <select id={yearId} value={year} onChange={(e) => onYearChange(e.target.value)}>
          <option value="">Any year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {genres.length > 0 && (
        <div className="field">
          <label htmlFor={genreId}>Genre</label>
          <select id={genreId} value={genre} onChange={(e) => onGenreChange(e.target.value)}>
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor={sortId}>Sort by</label>
        <select id={sortId} value={sort} onChange={(e) => onSortChange(e.target.value as SortOption)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o === 'default' ? (searching ? 'Best match' : 'Trending') : SORT_LABELS[o]}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className="btn btn--ghost" onClick={onReset} disabled={!dirty}>
        Reset filters
      </button>
    </div>
  );
}
