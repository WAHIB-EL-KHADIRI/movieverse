import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../app/router';
import { FavoritesProvider } from '../components/favorites/FavoritesProvider';

export function renderApp(initialEntry = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  const utils = render(
    <FavoritesProvider>
      <RouterProvider router={router} />
    </FavoritesProvider>,
  );
  return { router, ...utils };
}
