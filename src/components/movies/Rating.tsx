import { useI18n } from '../../i18n/useI18n';
import { formatRating } from '../../utils/format';

interface Props {
  value: number;
  votes?: number;
  /** `inline` = star + number, `ring` = circular score gauge. */
  variant?: 'inline' | 'ring';
}

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ringColor = (v: number): string => (v >= 7 ? 'var(--good)' : v >= 5 ? 'var(--star)' : 'var(--bad)');

export function Rating({ value, votes, variant = 'inline' }: Props) {
  const { t } = useI18n();
  const text = formatRating(value, votes);
  const unrated = text === 'NR';
  const label = unrated ? t('rating.none') : t('rating.value', { v: text });

  if (variant === 'ring') {
    const progress = unrated ? 0 : Math.min(Math.max(value / 10, 0), 1);
    return (
      <span className="ring" role="img" aria-label={label} title={label}>
        <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
          <circle cx="20" cy="20" r={RADIUS} className="ring__track" />
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            className="ring__value"
            stroke={ringColor(value)}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <span className="ring__text" aria-hidden="true">
          {unrated ? 'NR' : text}
        </span>
      </span>
    );
  }

  return (
    <span className="rating" aria-label={label} title={label}>
      <svg className="rating__star" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" fill="currentColor" />
      </svg>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}
