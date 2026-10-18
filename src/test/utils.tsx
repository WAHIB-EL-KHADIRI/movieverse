import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../app/router';
import { FavoritesProvider } from '../components/favorites/FavoritesProvider';
import { LanguageProvider } from '../i18n/LanguageProvider';

export function renderApp(initialEntry = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  const utils = render(
    <LanguageProvider>
      <FavoritesProvider>
        <RouterProvider router={router} />
      </FavoritesProvider>
    </LanguageProvider>,
  );
  return { router, ...utils };
}
