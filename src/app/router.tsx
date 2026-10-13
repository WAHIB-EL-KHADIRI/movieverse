import type { RouteObject } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { FavoritesPage } from '../pages/FavoritesPage';
import { MovieDetailsPage } from '../pages/MovieDetailsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { TrendingPage } from '../pages/TrendingPage';

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <TrendingPage /> },
      { path: '/movie/:movieId', element: <MovieDetailsPage /> },
      { path: '/favorites', element: <FavoritesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
