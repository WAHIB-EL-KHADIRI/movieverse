import type { ReactNode } from 'react';

interface Props {
  title: string;
  message: string;
  children?: ReactNode;
}

export function EmptyState({ title, message, children }: Props) {
  return (
    <div className="state" role="status">
      <div className="state__icon" aria-hidden="true">
        ◌
      </div>
      <h2 className="state__title">{title}</h2>
      <p className="state__message">{message}</p>
      {children && <div className="state__actions">{children}</div>}
    </div>
  );
}
