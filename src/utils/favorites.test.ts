import { describe, expect, it } from 'vitest';
import type { FavoriteMovie } from '../types/movie';
import { favoriteStats, filterAndSortFavorites } from './favorites';

const fav = (id: number, over: Partial<FavoriteMovie> = {}): FavoriteMovie => ({
  id,
  title: `Movie ${id}`,
  posterPath: null,
  releaseDate: '2020-01-01',
  voteAverage: 5,
  addedAt: id,
  ...over,
});

const ids = (list: FavoriteMovie[]) => list.map((f) => f.id);

describe('filterAndSortFavorites', () => {
  const list = [
    fav(1, { title: 'zebra', voteAverage: 6, releaseDate: '2019-05-01', addedAt: 100 }),
    fav(2, { title: 'Apple', voteAverage: 9, releaseDate: '', addedAt: 300 }),
    fav(3, { title: 'mango', voteAverage: 7, releaseDate: '2024-02-02', addedAt: 200 }),
  ];

  it('sorts by most recently added by default', () => {
    expect(ids(filterAndSortFavorites(list, '', 'recent'))).toEqual([2, 3, 1]);
  });

  it('sorts titles case-insensitively', () => {
    expect(ids(filterAndSortFavorites(list, '', 'title'))).toEqual([2, 3, 1]);
  });

  it('sorts by rating and by release date (missing dates last)', () => {
    expect(ids(filterAndSortFavorites(list, '', 'rating'))).toEqual([2, 3, 1]);
    expect(ids(filterAndSortFavorites(list, '', 'release'))).toEqual([3, 1, 2]);
  });

  it('filters by a case-insensitive title fragment and ignores surrounding spaces', () => {
    expect(ids(filterAndSortFavorites(list, '  MAN ', 'recent'))).toEqual([3]);
    expect(filterAndSortFavorites(list, 'nothing', 'recent')).toEqual([]);
  });

  it('never mutates its input', () => {
    const copy = [...list];
    filterAndSortFavorites(list, '', 'title');
    expect(list).toEqual(copy);
  });
});

describe('favoriteStats', () => {
  it('computes count, average of rated movies and the year range', () => {
    const stats = favoriteStats([
      fav(1, { voteAverage: 8, releaseDate: '1999-03-31' }),
      fav(2, { voteAverage: 6, releaseDate: '2021-01-01' }),
      fav(3, { voteAverage: 0, releaseDate: '' }),
    ]);
    expect(stats).toEqual({ count: 3, averageRating: 7, yearRange: [1999, 2021] });
  });

  it('returns nulls when nothing is rated or dated', () => {
    expect(favoriteStats([])).toEqual({ count: 0, averageRating: null, yearRange: null });
    expect(favoriteStats([fav(1, { voteAverage: 0, releaseDate: '' })])).toMatchObject({ averageRating: null, yearRange: null });
  });
});
