import { useState } from 'react';

interface Props {
  videoKey: string;
  title: string;
}

/**
 * Click-to-load trailer. Nothing is requested from YouTube until the user asks for it
 * (better performance and privacy), and the privacy-enhanced youtube-nocookie domain is used.
 */
export function TrailerPlayer({ videoKey, title }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn btn--ghost trailer-btn" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
        Watch trailer
      </button>
    );
  }

  return (
    <div className="trailer">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0`}
        title={`${title} — trailer`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
        Close trailer
      </button>
    </div>
  );
}
