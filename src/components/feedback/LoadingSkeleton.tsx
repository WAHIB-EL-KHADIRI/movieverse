export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading movies…
      </p>
      <ul className="movie-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="skeleton-card">
            <div className="skeleton skeleton--poster" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--short" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="details details--skeleton" aria-busy="true">
      <p className="sr-only" role="status">
        Loading movie details…
      </p>
      <div className="details__inner" aria-hidden="true">
        <div className="skeleton skeleton--poster details__poster" />
        <div className="details__body">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--block" />
        </div>
      </div>
    </div>
  );
}
