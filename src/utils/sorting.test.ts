import { describe, expect, it } from 'vitest';
import type { MovieSummary } from '../types/movie';
import { sortMovies } from './sorting';

const movie = (id: number, over: Partial<MovieSummary> = {}): MovieSummary => ({
  id,
  title: `M${id}`,
  overview: '',
  posterPath: null,
  backdropPath: null,
  releaseDate: '2020-01-01',
  voteAverage: 5,
  voteCount: 100,
  popularity: 1,
  genreIds: [],
  ...over,
});

const ids = (list: MovieSummary[]) => list.map((m) => m.id);

describe('sortMovies', () => {
  it('sorts by popularity descending', () => {
    const list = [movie(1, { popularity: 5 }), movie(2, { popularity: 50 }), movie(3, { popularity: 20 })];
    expect(ids(sortMovies(list, 'popularity'))).toEqual([2, 3, 1]);
  });

  it('sorts by rating descending and puts unrated films last', () => {
    const list = [
      movie(1, { voteAverage: 0, voteCount: 0 }),
      movie(2, { voteAverage: 6.1 }),
      movie(3, { voteAverage: 9.0 }),
      movie(4, { voteAverage: 10, voteCount: 0 }),
    ];
    expect(ids(sortMovies(list, 'rating'))).toEqual([3, 2, 4, 1]);
  });

  it('sorts by release date newest first and puts missing/invalid dates last', () => {
    const list = [
      movie(1, { releaseDate: '' }),
      movie(2, { releaseDate: '2019-03-01' }),
      movie(3, { releaseDate: '2024-12-31' }),
      movie(4, { releaseDate: 'garbage' }),
    ];
    expect(ids(sortMovies(list, 'release'))).toEqual([3, 2, 1, 4]);
  });

  it('keeps API order for "default" and for ties', () => {
    const list = [movie(1), movie(2), movie(3)];
    expect(ids(sortMovies(list, 'default'))).toEqual([1, 2, 3]);
    expect(ids(sortMovies(list, 'popularity'))).toEqual([1, 2, 3]);
  });

  it('does not mutate the input and tolerates NaN values', () => {
    const list = [movie(1, { popularity: NaN }), movie(2, { popularity: 3 })];
    const copy = [...list];
    expect(ids(sortMovies(list, 'popularity'))).toEqual([2, 1]);
    expect(list).toEqual(copy);
  });
});
