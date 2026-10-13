import type { ReactNode } from 'react';

interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, children }: Props) {
  return (
    <div className="state state--error" role="alert">
      <div className="state__icon" aria-hidden="true">
        !
      </div>
      <h2 className="state__title">{title}</h2>
      <p className="state__message">{message}</p>
      <div className="state__actions">
        {onRetry && (
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Try again
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
