import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FAVORITES_STORAGE_KEY } from '../utils/storage';
import { renderApp } from '../test/utils';

const stored = () => JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '[]') as { id: number }[];

describe('Favorites', () => {
  it('shows an empty state when there are no favorites', () => {
    renderApp('/favorites');
    expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /discover movies/i })).toHaveAttribute('href', '/');
  });

  it('adds from the details page, shows on /favorites, and survives a reload', async () => {
    const user = userEvent.setup();
    const first = renderApp('/movie/1');
    await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 });

    const button = screen.getByRole('button', { name: 'Add to Favorites' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(screen.getByRole('button', { name: 'Remove from Favorites' })).toHaveAttribute('aria-pressed', 'true');
    expect(stored().map((f) => f.id)).toEqual([1]);

    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: /favorites/i }));
    const grid = await screen.findByRole('list', { name: /favorite movies/i });
    expect(within(grid).getByRole('heading', { name: 'Alpha Rising' })).toBeInTheDocument();

    // "Reload": throw the whole React tree away and boot a fresh app against the same localStorage.
    first.unmount();
    renderApp('/favorites');
    expect(
      within(screen.getByRole('list', { name: /favorite movies/i })).getByRole('heading', { name: 'Alpha Rising' }),
    ).toBeInTheDocument();
  });

  it('removes a favorite from the favorites page', async () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([
        { id: 1, title: 'Alpha Rising', posterPath: null, releaseDate: '2023-05-10', voteAverage: 7.2, addedAt: 1 },
        { id: 2, title: 'Beta Protocol', posterPath: null, releaseDate: '2021-01-20', voteAverage: 8.9, addedAt: 2 },
      ]),
    );
    const user = userEvent.setup();
    renderApp('/favorites');

    await user.click(screen.getByRole('button', { name: /remove alpha rising from favorites/i }));
    expect(screen.queryByRole('heading', { name: 'Alpha Rising' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beta Protocol' })).toBeInTheDocument();
    expect(stored().map((f) => f.id)).toEqual([2]);

    await user.click(screen.getByRole('button', { name: /remove beta protocol from favorites/i }));
    expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument();
    expect(stored()).toEqual([]);
  });

  it('keeps the heart in sync across Trending, Details, Favorites and the header badge', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });

    await user.click(screen.getByRole('button', { name: 'Add Beta Protocol to favorites' }));
    expect(screen.getByRole('button', { name: 'Remove Beta Protocol from favorites' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('1 saved')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /beta protocol — view details/i }));
    expect(await screen.findByRole('button', { name: 'Remove from Favorites' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove from Favorites' }));
    await user.click(screen.getByRole('button', { name: /^← back/i }));
    expect(await screen.findByRole('button', { name: 'Add Beta Protocol to favorites' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByLabelText('1 saved')).not.toBeInTheDocument();
  });

  it('does not duplicate a favorite toggled repeatedly', async () => {
    const user = userEvent.setup();
    renderApp('/movie/1');
    await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 });
    await user.click(screen.getByRole('button', { name: 'Add to Favorites' }));
    await user.click(screen.getByRole('button', { name: 'Remove from Favorites' }));
    await user.click(screen.getByRole('button', { name: 'Add to Favorites' }));
    expect(stored()).toHaveLength(1);
  });

  it('stores only minimal data', async () => {
    const user = userEvent.setup();
    renderApp('/movie/1');
    await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 });
    await user.click(screen.getByRole('button', { name: 'Add to Favorites' }));
    expect(Object.keys(stored()[0]!).sort()).toEqual(['addedAt', 'id', 'posterPath', 'releaseDate', 'title', 'voteAverage']);
  });

  it('starts empty and keeps working when stored JSON is corrupted', async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '[{"id":1,');
    const user = userEvent.setup();
    renderApp('/movie/1');
    await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 });
    expect(screen.getByRole('button', { name: 'Add to Favorites' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add to Favorites' }));
    expect(stored().map((f) => f.id)).toEqual([1]); // overwritten with valid data
  });

  it('ignores invalid items but loads valid ones', () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([{ nope: 1 }, { id: 2, title: 'Beta Protocol', posterPath: null, releaseDate: '', voteAverage: 8, addedAt: 1 }]),
    );
    renderApp('/favorites');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('keeps working in memory and warns when localStorage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const user = userEvent.setup();
    renderApp('/movie/1');
    await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 });

    await user.click(screen.getByRole('button', { name: 'Add to Favorites' }));
    expect(screen.getByRole('button', { name: 'Remove from Favorites' })).toBeInTheDocument(); // UI still updates

    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: /favorites/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/blocked saving/i);
    expect(screen.getByRole('heading', { name: 'Alpha Rising' })).toBeInTheDocument();
  });

  it('syncs changes made in another tab', async () => {
    renderApp('/favorites');
    expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument();

    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([{ id: 3, title: 'Gamma Ray', posterPath: null, releaseDate: '', voteAverage: 5, addedAt: 1 }]),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: FAVORITES_STORAGE_KEY }));
    expect(await screen.findByRole('heading', { name: 'Gamma Ray' })).toBeInTheDocument();
  });
});
