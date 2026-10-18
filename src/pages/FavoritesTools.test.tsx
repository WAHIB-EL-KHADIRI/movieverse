import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/utils';
import { FAVORITES_STORAGE_KEY } from '../utils/storage';

const item = (id: number, title: string, over: Record<string, unknown> = {}) => ({
  id,
  title,
  posterPath: null,
  releaseDate: '2020-06-01',
  voteAverage: 7,
  addedAt: id,
  ...over,
});

const seed = () =>
  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify([
      item(1, 'Zebra Run', { voteAverage: 6, releaseDate: '2019-05-01' }),
      item(2, 'Apple Seed', { voteAverage: 9, releaseDate: '2024-01-01' }),
      item(3, 'Mango Tree', { voteAverage: 0, releaseDate: '' }),
    ]),
  );

const order = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const stored = () => JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '[]') as { id: number }[];

describe('Favorites tools', () => {
  it('shows statistics', () => {
    seed();
    renderApp('/favorites');
    const stats = document.querySelector('dl')!;
    expect(within(stats).getByText('Movies').nextElementSibling).toHaveTextContent('3');
    expect(within(stats).getByText('Average rating').nextElementSibling).toHaveTextContent('7.5'); // (6 + 9) / 2, unrated ignored
    expect(within(stats).getByText('Years covered').nextElementSibling).toHaveTextContent('2019–2024');
  });

  it('sorts the favorites', async () => {
    seed();
    const user = userEvent.setup();
    renderApp('/favorites');
    expect(order()).toEqual(['Mango Tree', 'Apple Seed', 'Zebra Run']); // recently added first

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'Title (A–Z)');
    expect(order()).toEqual(['Apple Seed', 'Mango Tree', 'Zebra Run']);
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'Rating');
    expect(order()).toEqual(['Apple Seed', 'Zebra Run', 'Mango Tree']);
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'Release date');
    expect(order()).toEqual(['Apple Seed', 'Zebra Run', 'Mango Tree']);
  });

  it('filters by title and offers a way out when nothing matches', async () => {
    seed();
    const user = userEvent.setup();
    renderApp('/favorites');

    await user.type(screen.getByLabelText(/find in favorites/i), 'seed');
    expect(order()).toEqual(['Apple Seed']);

    await user.clear(screen.getByLabelText(/find in favorites/i));
    await user.type(screen.getByLabelText(/find in favorites/i), 'zzz');
    expect(screen.getByText(/none of your favorites match/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear search/i }));
    expect(order()).toHaveLength(3);
  });

  it('exports a JSON file', async () => {
    seed();
    const user = userEvent.setup();
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderApp('/favorites');

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(click).toHaveBeenCalledTimes(1);
    const exported = JSON.parse(await blob!.text()) as { app: string; favorites: { id: number }[] };
    expect(exported.app).toBe('movieverse');
    expect(exported.favorites.map((f) => f.id).sort()).toEqual([1, 2, 3]);
  });

  it('imports favorites from a file, merging without duplicates', async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([item(1, 'Zebra Run')]));
    const user = userEvent.setup();
    renderApp('/favorites');

    const file = new File([JSON.stringify({ favorites: [item(1, 'Zebra Run'), item(9, 'Imported One'), { bad: true }] })], 'f.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByLabelText(/import favorites file/i), file);

    expect(await screen.findByRole('status')).toHaveTextContent('Imported 1 new favorite.');
    expect(order().sort()).toEqual(['Imported One', 'Zebra Run']);
    expect(stored().map((f) => f.id).sort()).toEqual([1, 9]);
  });

  it('works from the empty state and tells you when a file has nothing usable', async () => {
    const user = userEvent.setup();
    renderApp('/favorites');
    expect(screen.getByRole('button', { name: /import favorites$/i })).toBeInTheDocument();

    await user.upload(screen.getByLabelText(/import favorites file/i), new File(['not json'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no valid favorites/i);
    expect(stored()).toEqual([]);
  });

  it('says so when everything in the file is already saved', async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([item(1, 'Zebra Run')]));
    const user = userEvent.setup();
    renderApp('/favorites');
    await user.upload(
      screen.getByLabelText(/import favorites file/i),
      new File([JSON.stringify([item(1, 'Zebra Run')])], 'f.json', { type: 'application/json' }),
    );
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/nothing new/i));
  });
});
