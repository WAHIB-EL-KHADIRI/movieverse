/** Raw TMDB-shaped payloads used by the mock server. */
export interface RawFixture {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
}

export const RAW_MOVIES: RawFixture[] = [
  {
    id: 1,
    title: 'Alpha Rising',
    overview: 'The first film.',
    poster_path: '/alpha.jpg',
    backdrop_path: '/alpha-bg.jpg',
    release_date: '2023-05-10',
    vote_average: 7.2,
    vote_count: 900,
    popularity: 50,
  },
  {
    id: 2,
    title: 'Beta Protocol',
    overview: 'The second film.',
    poster_path: '/beta.jpg',
    backdrop_path: null,
    release_date: '2021-01-20',
    vote_average: 8.9,
    vote_count: 4000,
    popularity: 10,
  },
  {
    id: 3,
    title: 'Gamma Ray',
    overview: 'The third film.',
    poster_path: null,
    backdrop_path: null,
    release_date: '2024-11-02',
    vote_average: 5.5,
    vote_count: 300,
    popularity: 99,
  },
];

export const RAW_DETAILS = {
  ...RAW_MOVIES[0]!,
  runtime: 135,
  tagline: 'It begins.',
  genres: [
    { id: 28, name: 'Action' },
    { id: 878, name: 'Science Fiction' },
  ],
};
