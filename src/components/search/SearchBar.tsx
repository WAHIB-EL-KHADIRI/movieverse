import { useEffect, useId, useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  busy?: boolean;
}

export function SearchBar({ value, onChange, busy = false }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Press "/" anywhere (outside form fields) to jump to the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor={id} className="sr-only">
        Search movies by title
      </label>
      <svg className="search__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M20 20l-3.500-3.500" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        ref={inputRef}
        className="search__input"
        type="search"
        autoComplete="off"
        placeholder="Search movies by title…  (press / to focus)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {busy && <span className="spinner" role="status" aria-label="Searching" />}
      {value && !busy && (
        <button type="button" className="search__clear" aria-label="Clear search" onClick={() => onChange('')}>
          ×
        </button>
      )}
    </form>
  );
}
