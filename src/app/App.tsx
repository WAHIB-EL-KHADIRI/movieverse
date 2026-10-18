import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { FavoritesProvider } from '../components/favorites/FavoritesProvider';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { routes } from './router';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <LanguageProvider>
      <FavoritesProvider>
        <RouterProvider router={router} />
      </FavoritesProvider>
    </LanguageProvider>
  );
}
