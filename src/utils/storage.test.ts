import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FavoriteMovie } from '../types/movie';
import { FAVORITES_STORAGE_KEY, loadFavorites, parseFavorites, saveFavorites } from './storage';

const fav = (id: number): FavoriteMovie => ({
  id,
  title: `Movie ${id}`,
  posterPath: '/p.jpg',
  releaseDate: '2020-01-01',
  voteAverage: 7,
  addedAt: 1,
});

afterEach(() => vi.restoreAllMocks());

describe('favorites storage', () => {
  it('round-trips favorites through localStorage', () => {
    expect(saveFavorites([fav(1), fav(2)])).toBe(true);
    expect(loadFavorites()).toEqual([fav(1), fav(2)]);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(loadFavorites()).toEqual([]);
  });

  it('survives corrupted JSON', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{not json');
    expect(loadFavorites()).toEqual([]);
  });

  it('ignores a stored value that is not an array', () => {
    expect(parseFavorites('{"id":1}')).toEqual([]);
    expect(parseFavorites('"hello"')).toEqual([]);
    expect(parseFavorites('null')).toEqual([]);
  });

  it('drops invalid entries, keeps valid ones and removes duplicate IDs', () => {
    const raw = JSON.stringify([
      fav(1),
      { id: 'x', title: 'bad id' },
      null,
      42,
      { ...fav(2), voteAverage: 'high' },
      { ...fav(3), id: -3 },
      fav(1),
      fav(4),
    ]);
    expect(parseFavorites(raw).map((f) => f.id)).toEqual([1, 4]);
  });

  it('strips unknown fields from stored items', () => {
    const [item] = parseFavorites(JSON.stringify([{ ...fav(1), evil: '<script>' }]));
    expect(item).not.toHaveProperty('evil');
  });

  it('does not throw when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadFavorites()).toEqual([]);
  });

  it('reports failure (instead of throwing) when the write fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(saveFavorites([fav(1)])).toBe(false);
  });
});
