import { useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import type { CastMember } from '../../types/movie';
import { profileUrl } from '../../utils/format';

function Avatar({ member }: { member: CastMember }) {
  const [failed, setFailed] = useState(false);
  const src = profileUrl(member.profilePath);
  if (!src || failed) {
    const initials = member.name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
    return (
      <div className="cast__avatar cast__avatar--fallback" aria-hidden="true">
        {initials}
      </div>
    );
  }
  return <img className="cast__avatar" src={src} alt="" loading="lazy" decoding="async" width={92} height={92} onError={() => setFailed(true)} />;
}

export function CastList({ cast }: { cast: CastMember[] }) {
  const { t } = useI18n();
  if (cast.length === 0) return null;
  return (
    <section aria-labelledby="cast-title" className="extra">
      <h2 id="cast-title" className="details__subtitle">
        {t('details.cast')}
      </h2>
      <ul className="cast">
        {cast.map((m) => (
          <li key={m.id} className="cast__item">
            <Avatar member={m} />
            <span className="cast__name">{m.name}</span>
            {m.character && <span className="cast__role">{m.character}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
