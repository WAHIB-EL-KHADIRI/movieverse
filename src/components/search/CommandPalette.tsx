import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { errorMessage, fetchMovies, isAbortError } from '../../services/tmdb';
import type { MovieSummary } from '../../types/movie';
import { formatRating, getYear } from '../../utils/format';
import { Poster } from '../movies/Poster';

const MAX_RESULTS = 6;
const DEBOUNCE_MS = 250;

interface Outcome {
  query: string;
  movies: MovieSummary[];
  error: string | null;
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const query = useDebounce(text.trim(), DEBOUNCE_MS);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const controller = new AbortController();
    fetchMovies({ query, year: '', sort: 'default', page: 1 }, controller.signal)
      .then((page) => {
        if (!cancelled) setOutcome({ query, movies: page.results.slice(0, MAX_RESULTS), error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled && !isAbortError(error)) setOutcome({ query, movies: [], error: errorMessage(error) });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query]);

  // Results belong to the query that produced them; anything else is stale and hidden.
  const current = query && outcome?.query === query ? outcome : null;
  const movies = current?.movies ?? [];
  const loading = !!query && !current;
  const activeIndex = Math.min(active, Math.max(movies.length - 1, 0));

  const open = (movie: MovieSummary) => {
    onClose();
    navigate(`/movie/${movie.id}`);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' && movies.length) {
      e.preventDefault();
      setActive((activeIndex + 1) % movies.length);
    } else if (e.key === 'ArrowUp' && movies.length) {
      e.preventDefault();
      setActive((activeIndex - 1 + movies.length) % movies.length);
    } else if (e.key === 'Enter' && movies[activeIndex]) {
      e.preventDefault();
      open(movies[activeIndex]);
    }
  };

  return (
    <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Quick search" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          className="palette__input"
          type="text"
          role="combobox"
          aria-expanded={movies.length > 0}
          aria-controls={listId}
          aria-activedescendant={movies.length ? `${listId}-${activeIndex}` : undefined}
          aria-label="Search movies"
          autoComplete="off"
          placeholder="Jump to a movie…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
          }}
        />
        <ul id={listId} className="palette__list" role="listbox" aria-label="Results">
          {movies.map((m, i) => (
            <li
              key={m.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`palette__item ${i === activeIndex ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => open(m)}
            >
              <span className="palette__thumb">
                <Poster path={m.posterPath} title={m.title} size="w185" />
              </span>
              <span className="palette__text">
                <strong>{m.title}</strong>
                <span>
                  {getYear(m.releaseDate) || 'Year unknown'} · ★ {formatRating(m.voteAverage, m.voteCount)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="palette__status" role="status">
          {!query && 'Type to search · ↑↓ to move · Enter to open · Esc to close'}
          {loading && 'Searching…'}
          {current?.error}
          {current && !current.error && movies.length === 0 && `No movies found for “${query}”.`}
        </p>
      </div>
    </div>
  );
}

/** Ctrl/⌘+K quick-search overlay available on every page. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        className="palette-trigger"
        onClick={(e) => {
          opener.current = e.currentTarget;
          setOpen(true);
        }}
        aria-label="Open quick search (Ctrl+K)"
      >
        <span aria-hidden="true">⌕</span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </button>
      {open && <Palette onClose={close} />}
    </>
  );
}
