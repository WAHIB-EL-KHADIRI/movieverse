import { useI18n } from '../../i18n/useI18n';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container">
        <p>
          {t('footer.before')}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
            TMDB
          </a>
          {t('footer.after')}
        </p>
      </div>
    </footer>
  );
}
