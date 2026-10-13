import { Link } from 'react-router-dom';
import { ErrorState } from '../components/feedback/ErrorState';

export function NotFoundPage() {
  return (
    <ErrorState title="Page not found" message="The page you’re looking for doesn’t exist.">
      <Link to="/" className="btn btn--primary">
        Back to trending
      </Link>
    </ErrorState>
  );
}
