import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';

const REPO_URL = 'https://github.com/WAHIB-EL-KHADIRI/movieverse';
const TMDB_URL = 'https://www.themoviedb.org/';
const TMDB_DOCS_URL = 'https://developer.themoviedb.org/docs';

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Link to="/" className="logo" aria-label={t('nav.home')} dir="ltr">
            Movie<span>Verse</span>
          </Link>
          <p className="footer__tagline">{t('footer.tagline')}</p>
          <p className="footer__stack">{t('footer.stack')}</p>
        </div>

        <nav className="footer__col" aria-label={t('footer.explore')}>
          <h2 className="footer__heading">{t('footer.explore')}</h2>
          <ul>
            <li>
              <Link to="/">{t('nav.trending')}</Link>
            </li>
            <li>
              <Link to="/favorites">{t('nav.favorites')}</Link>
            </li>
          </ul>
        </nav>

        <div className="footer__col">
          <h2 className="footer__heading">{t('footer.resources')}</h2>
          <ul>
            <li>
              <ExternalLink href={TMDB_DOCS_URL}>{t('footer.tmdbDocs')}</ExternalLink>
            </li>
            <li>
              <ExternalLink href={REPO_URL}>{t('footer.source')}</ExternalLink>
            </li>
          </ul>
        </div>

        <button
          type="button"
          className="btn btn--ghost footer__top"
          onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
        >
          <span aria-hidden="true">↑</span> {t('footer.top')}
        </button>
      </div>

      <div className="container footer__legal">
        {/* Attribution text required by TMDB's terms of use – keep this sentence intact. */}
        <p className="footer__attribution">
          {t('footer.before')}
          <ExternalLink href={TMDB_URL}>TMDB</ExternalLink>
          {t('footer.after')}
        </p>
        <p>{t('footer.rights')}</p>
      </div>
    </footer>
  );
}
