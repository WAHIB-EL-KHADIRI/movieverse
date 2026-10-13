import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { FavoritesProvider } from '../components/favorites/FavoritesProvider';
import { routes } from './router';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <FavoritesProvider>
      <RouterProvider router={router} />
    </FavoritesProvider>
  );
}
