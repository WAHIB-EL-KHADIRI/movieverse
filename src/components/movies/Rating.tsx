import { formatRating } from '../../utils/format';

interface Props {
  value: number;
  votes?: number;
}

export function Rating({ value, votes }: Props) {
  const text = formatRating(value, votes);
  const label = text === 'NR' ? 'Not rated yet' : `Rated ${text} out of 10`;
  return (
    <span className="rating" aria-label={label} title={label}>
      <svg className="rating__star" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" fill="currentColor" />
      </svg>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}
