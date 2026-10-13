import { useState } from 'react';
import { posterUrl } from '../../utils/format';
import type { PosterSize } from '../../utils/format';

interface Props {
  path: string | null;
  title: string;
  size?: PosterSize;
  priority?: boolean;
}

/** Poster with a graceful fallback for missing or broken images. */
export function Poster({ path, title, size = 'w342', priority = false }: Props) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const src = posterUrl(path, size);

  if (!src || failedPath === path) {
    return (
      <div className="poster poster--fallback" role="img" aria-label={`No poster available for ${title}`}>
        <span aria-hidden="true">🎬</span>
        <span className="poster__fallback-title" aria-hidden="true">
          {title}
        </span>
      </div>
    );
  }

  return (
    <img
      className="poster"
      src={src}
      alt={`Poster of ${title}`}
      width={342}
      height={513}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedPath(path)}
    />
  );
}
