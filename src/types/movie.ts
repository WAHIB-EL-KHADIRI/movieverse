export interface MovieSummary {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface MovieDetails extends MovieSummary {
  genres: Genre[];
  runtime: number | null;
  tagline: string;
}

export interface MoviePage {
  page: number;
  totalPages: number;
  totalResults: number;
  results: MovieSummary[];
}

export interface FavoriteMovie {
  id: number;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  addedAt: number;
}

export type SortOption = 'default' | 'popularity' | 'rating' | 'release';


export interface RawMovie {
  id?: unknown;
  title?: unknown;
  overview?: unknown;
  poster_path?: unknown;
  backdrop_path?: unknown;
  release_date?: unknown;
  vote_average?: unknown;
  vote_count?: unknown;
  popularity?: unknown;
  genres?: unknown;
  runtime?: unknown;
  tagline?: unknown;
}
