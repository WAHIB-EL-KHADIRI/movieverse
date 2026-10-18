import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';

interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function ErrorState({ title, message, onRetry, children }: Props) {
  const { t } = useI18n();
  return (
    <div className="state state--error" role="alert">
      <div className="state__icon" aria-hidden="true">
        !
      </div>
      <h2 className="state__title">{title ?? t('state.errorTitle')}</h2>
      <p className="state__message">{message}</p>
      <div className="state__actions">
        {onRetry && (
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            {t('state.retry')}
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
