import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import { ErrorState } from '../components/feedback/ErrorState';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <ErrorState title={t('notfound.title')} message={t('notfound.msg')}>
      <Link to="/" className="btn btn--primary">
        {t('notfound.back')}
      </Link>
    </ErrorState>
  );
}
