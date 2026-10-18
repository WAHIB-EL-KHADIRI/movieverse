import { Outlet } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';
import { Footer } from './Footer';
import { Header } from './Header';

export function Layout() {
  const { t } = useI18n();
  return (
    <>
      <a href="#main" className="skip-link">
        {t('app.skip')}
      </a>
      <Header />
      <main id="main" className="container main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
