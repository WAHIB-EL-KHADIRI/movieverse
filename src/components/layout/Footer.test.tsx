import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '../../i18n/detect';
import { renderApp } from '../../test/utils';

const footer = () => screen.getByRole('contentinfo');

describe('Footer', () => {
  it('keeps the attribution sentence required by TMDB, with a safe external link', () => {
    renderApp('/favorites');
    expect(footer()).toHaveTextContent('This product uses the TMDB API but is not endorsed or certified by TMDB.');
    const link = within(footer()).getByRole('link', { name: 'TMDB' });
    expect(link).toHaveAttribute('href', 'https://www.themoviedb.org/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(footer()).toHaveTextContent('Movie data and images © TMDB and their respective owners.');
  });

  it('offers navigation and resources', () => {
    renderApp('/favorites');
    const nav = within(footer()).getByRole('navigation', { name: 'Explore' });
    expect(within(nav).getByRole('link', { name: 'Trending' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Favorites' })).toHaveAttribute('href', '/favorites');
    expect(within(footer()).getByRole('link', { name: 'TMDB API docs' })).toHaveAttribute('href', 'https://developer.themoviedb.org/docs');
    const source = within(footer()).getByRole('link', { name: 'Source code' });
    expect(source).toHaveAttribute('href', expect.stringContaining('github.com/'));
    expect(source).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('scrolls back to the top', async () => {
    const user = userEvent.setup();
    renderApp('/favorites');
    await user.click(within(footer()).getByRole('button', { name: /back to top/i }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('is translated, including the attribution sentence', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    renderApp('/favorites');
    expect(footer()).toHaveTextContent('Ce produit utilise l’API TMDB mais n’est ni approuvé ni certifié par TMDB.');
    expect(within(footer()).getByRole('button', { name: /retour en haut/i })).toBeInTheDocument();
  });
});
