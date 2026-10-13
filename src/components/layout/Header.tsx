import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useFavorites } from '../../hooks/useFavorites';

type Theme = 'dark' | 'light';
const THEME_KEY = 'movieverse:theme';

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* theme still applies for this session */
    }
  };

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}

export function Header() {
  const { favorites } = useFavorites();
  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="logo" aria-label="MovieVerse home">
          Movie<span>Verse</span>
        </Link>
        <nav aria-label="Main">
          <ul className="nav">
            <li>
              <NavLink to="/" end className="nav__link">
                Trending
              </NavLink>
            </li>
            <li>
              <NavLink to="/favorites" className="nav__link">
                Favorites
                {favorites.length > 0 && (
                  <span className="badge" aria-label={`${favorites.length} saved`}>
                    {favorites.length}
                  </span>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
