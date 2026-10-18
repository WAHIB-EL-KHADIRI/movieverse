import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useFavorites } from '../../hooks/useFavorites';
import { LANGUAGES } from '../../i18n/translations';
import type { Lang } from '../../i18n/translations';
import { useI18n } from '../../i18n/useI18n';
import { CommandPalette } from '../search/CommandPalette';

type Theme = 'dark' | 'light';
const THEME_KEY = 'movieverse:theme';

function ThemeToggle() {
  const { t } = useI18n();
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
      aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}

function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      className="lang-select"
      aria-label={t('lang.label')}
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} lang={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

export function Header() {
  const { favorites } = useFavorites();
  const { t } = useI18n();
  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="logo" aria-label={t('nav.home')} dir="ltr">
          Movie<span>Verse</span>
        </Link>
        <nav aria-label={t('nav.main')}>
          <ul className="nav">
            <li>
              <NavLink to="/" end className="nav__link">
                {t('nav.trending')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/favorites" className="nav__link">
                {t('nav.favorites')}
                {favorites.length > 0 && (
                  <span className="badge" aria-label={t('nav.savedBadge', { n: favorites.length })}>
                    {favorites.length}
                  </span>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>
        <CommandPalette />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
