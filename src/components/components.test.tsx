import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './feedback/ErrorState';
import { FavoritesProvider } from './favorites/FavoritesProvider';
import { FilterBar } from './filters/FilterBar';
import { Hero } from './movies/Hero';
import { MovieCard } from './movies/MovieCard';
import { Rating } from './movies/Rating';
import { SearchBar } from './search/SearchBar';

const movie = {
  id: 7,
  title: 'Test Movie',
  posterPath: '/t.jpg',
  releaseDate: '2022-02-03',
  voteAverage: 6.84,
  voteCount: 10,
};

const wrap = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <FavoritesProvider>{ui}</FavoritesProvider>
    </MemoryRouter>,
  );

describe('MovieCard', () => {
  it('renders poster, title, rating, date and a link to the details page', () => {
    wrap(<MovieCard movie={movie} />);
    expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    expect(screen.getByLabelText('Rated 6.8 out of 10')).toBeInTheDocument();
    expect(screen.getByText('Feb 3, 2022')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /poster of test movie/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /test movie — view details/i })).toHaveAttribute('href', '/movie/7');
  });

  it('shows "NR" and a fallback when the movie has no rating, date or poster', () => {
    wrap(<MovieCard movie={{ ...movie, posterPath: null, releaseDate: '', voteAverage: 0, voteCount: 0 }} />);
    expect(screen.getByLabelText('Not rated yet')).toBeInTheDocument();
    expect(screen.getByText('Release date unknown')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /no poster available/i })).toBeInTheDocument();
  });

  it('toggles its favorite button', async () => {
    const user = userEvent.setup();
    wrap(<MovieCard movie={movie} />);
    const heart = screen.getByRole('button', { name: 'Add Test Movie to favorites' });
    await user.click(heart);
    expect(screen.getByRole('button', { name: 'Remove Test Movie from favorites' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Remove Test Movie from favorites' }));
    expect(screen.getByRole('button', { name: 'Add Test Movie to favorites' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('SearchBar', () => {
  it('reports typing and clears via the clear button', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar value="ab" onChange={onChange} />);
    await user.type(screen.getByRole('searchbox', { name: /search movies/i }), 'c');
    expect(onChange).toHaveBeenLastCalledWith('abc');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('shows a busy indicator instead of the clear button while searching', () => {
    render(<SearchBar value="ab" onChange={() => {}} busy />);
    expect(screen.getByRole('status', { name: 'Searching' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 18, name: 'Drama' },
];

describe('FilterBar', () => {
  it('emits the selected genre and hides the genre select when no genres loaded', async () => {
    const user = userEvent.setup();
    const onGenreChange = vi.fn();
    const noop = () => {};
    const props = { year: '', sort: 'default', genre: '', searching: false, onYearChange: noop, onSortChange: noop, onReset: noop, onGenreChange } as const;
    const { rerender } = render(<FilterBar {...props} genres={GENRES} />);

    await user.selectOptions(screen.getByLabelText(/genre/i), 'Drama');
    expect(onGenreChange).toHaveBeenCalledWith('18');

    rerender(<FilterBar {...props} genres={[]} />);
    expect(screen.queryByLabelText(/genre/i)).not.toBeInTheDocument();
  });

  const setup = (props: Partial<React.ComponentProps<typeof FilterBar>> = {}) => {
    const handlers = { onYearChange: vi.fn(), onSortChange: vi.fn(), onGenreChange: vi.fn(), onReset: vi.fn() };
    render(<FilterBar year="" sort="default" genre="" genres={GENRES} searching={false} {...handlers} {...props} />);
    return handlers;
  };

  it('emits the selected year and sort option', async () => {
    const user = userEvent.setup();
    const h = setup();
    await user.selectOptions(screen.getByLabelText(/release year/i), '2020');
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'Rating');
    expect(h.onYearChange).toHaveBeenCalledWith('2020');
    expect(h.onSortChange).toHaveBeenCalledWith('rating');
  });

  it('offers all sort options and labels the default according to the mode', () => {
    setup({ searching: true });
    expect(screen.getAllByRole('option', { name: /best match|popularity|rating|release date/i }).map((o) => o.textContent)).toEqual([
      'Best match',
      'Popularity',
      'Rating',
      'Release date',
    ]);
  });

  it('enables Reset only when a filter is active', async () => {
    const user = userEvent.setup();
    const { onReset } = setup();
    expect(screen.getByRole('button', { name: /reset filters/i })).toBeDisabled();
    expect(onReset).not.toHaveBeenCalled();
    render(
      <FilterBar
        year="2020"
        sort="default"
        genre=""
        genres={GENRES}
        searching={false}
        onYearChange={() => {}}
        onSortChange={() => {}}
        onGenreChange={() => {}}
        onReset={onReset}
      />,
    );
    const buttons = screen.getAllByRole('button', { name: /reset filters/i });
    await user.click(buttons[1]!);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorState', () => {
  it('is announced as an alert and calls onRetry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Boom" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Rating ring', () => {
  it('exposes the score to assistive tech and shows the number', () => {
    render(<Rating value={7.84} votes={50} variant="ring" />);
    expect(screen.getByRole('img', { name: 'Rated 7.8 out of 10' })).toHaveTextContent('7.8');
  });

  it('shows "NR" for unrated movies', () => {
    render(<Rating value={0} votes={0} variant="ring" />);
    expect(screen.getByRole('img', { name: 'Not rated yet' })).toHaveTextContent('NR');
  });

  it('fills the ring proportionally to the score', () => {
    const { container } = render(<Rating value={5} votes={9} variant="ring" />);
    const arc = container.querySelector('.ring__value')!;
    const circumference = Number(arc.getAttribute('stroke-dasharray'));
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference / 2, 5);
  });
});

describe('Hero spotlight', () => {
  const slides = [1, 2, 3].map((id) => ({
    id,
    title: `Slide ${id}`,
    overview: `Overview ${id}`,
    posterPath: null,
    backdropPath: `/b${id}.jpg`,
    releaseDate: '2024-01-01',
    voteAverage: 7,
    voteCount: 10,
    popularity: 1,
    genreIds: [],
  }));
  const renderHero = () =>
    render(
      <MemoryRouter>
        <Hero movies={slides} />
      </MemoryRouter>,
    );

  it('lets the user pick a featured movie with the dots', async () => {
    const user = userEvent.setup();
    renderHero();
    expect(screen.getByRole('heading', { name: 'Slide 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show Slide 3' }));
    expect(screen.getByRole('heading', { name: 'Slide 3' })).toBeInTheDocument();
    expect(screen.getByText('#3 trending this week')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/movie/3');
  });

  it('rotates automatically, wraps around, and pauses while hovered', () => {
    vi.useFakeTimers();
    try {
      renderHero();
      act(() => void vi.advanceTimersByTime(7000));
      expect(screen.getByRole('heading', { name: 'Slide 2' })).toBeInTheDocument();

      fireEvent.mouseEnter(screen.getByRole('region'));
      act(() => void vi.advanceTimersByTime(30_000));
      expect(screen.getByRole('heading', { name: 'Slide 2' })).toBeInTheDocument(); // paused

      fireEvent.mouseLeave(screen.getByRole('region'));
      act(() => void vi.advanceTimersByTime(14_000));
      expect(screen.getByRole('heading', { name: 'Slide 1' })).toBeInTheDocument(); // 2 → 3 → 1
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not auto-rotate when the user prefers reduced motion', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    try {
      renderHero();
      act(() => void vi.advanceTimersByTime(30_000));
      expect(screen.getByRole('heading', { name: 'Slide 1' })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('shows no dots for a single slide', () => {
    render(
      <MemoryRouter>
        <Hero movies={slides.slice(0, 1)} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('group', { name: /featured/i })).not.toBeInTheDocument();
  });
});
