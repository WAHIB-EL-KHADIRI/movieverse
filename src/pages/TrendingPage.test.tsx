import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { RAW_MOVIES } from '../test/fixtures';
import { API, requestLog, server } from '../test/server';
import { renderApp } from '../test/utils';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const titles = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const searchBox = () => screen.getByRole('searchbox', { name: /search movies/i });
const searchCalls = () => requestLog.filter((r) => r.startsWith('/search/movie'));

describe('Trending page', () => {
  it('shows a loading state, then movie cards with poster, title, rating and release date', async () => {
    renderApp();
    expect(screen.getByText(/loading movies/i)).toBeInTheDocument();

    const grid = await screen.findByRole('list', { name: /trending this week/i });
    const first = within(grid).getAllByRole('article')[0]!;
    expect(within(first).getByRole('heading', { name: 'Alpha Rising' })).toBeInTheDocument();
    expect(within(first).getByLabelText('Rated 7.2 out of 10')).toBeInTheDocument();
    expect(within(first).getByText('May 10, 2023')).toBeInTheDocument();
    expect(within(first).getByRole('img', { name: /poster of alpha rising/i })).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w342/alpha.jpg',
    );
    expect(screen.queryByText(/loading movies/i)).not.toBeInTheDocument();
  });

  it('shows a fallback instead of a broken image when a poster is missing', async () => {
    renderApp();
    await screen.findByRole('heading', { name: 'Gamma Ray' });
    expect(screen.getByRole('img', { name: /no poster available for gamma ray/i })).toBeInTheDocument();
  });

  it('shows the #1 trending movie in a hero section', async () => {
    renderApp();
    const hero = await screen.findByRole('region', { name: 'Alpha Rising' });
    expect(within(hero).getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/movie/1');
  });

  it('shows an error state and recovers on retry', async () => {
    let fail = true;
    server.use(
      http.get(`${API}/trending/movie/week`, () =>
        fail ? new HttpResponse(null, { status: 500 }) : HttpResponse.json({ page: 1, total_pages: 1, results: RAW_MOVIES }),
      ),
    );
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(/TMDB is having trouble/i);
    fail = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Alpha Rising', level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains how to fix a missing API key', async () => {
    vi.stubEnv('VITE_TMDB_API_KEY', '');
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(/VITE_TMDB_API_KEY/);
  });

  it('shows an empty state when the API returns no movies', async () => {
    server.use(http.get(`${API}/trending/movie/week`, () => HttpResponse.json({ page: 1, total_pages: 1, results: [] })));
    renderApp();
    expect(await screen.findByText(/no movies found/i)).toBeInTheDocument();
  });

  it('paginates with "Load more" and stops at the last page', async () => {
    server.use(
      http.get(`${API}/trending/movie/week`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        const results = page === 1 ? RAW_MOVIES.slice(0, 2) : RAW_MOVIES.slice(1); // page 2 repeats id 2
        return HttpResponse.json({ page, total_pages: 2, results });
      }),
    );
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole('heading', { name: 'Beta Protocol', level: 3 });
    expect(titles()).toEqual(['Alpha Rising', 'Beta Protocol']);
    await user.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => expect(titles()).toEqual(['Alpha Rising', 'Beta Protocol', 'Gamma Ray'])); // no duplicate
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    expect(screen.getByText(/reached the end/i)).toBeInTheDocument();
  });

  describe('search', () => {
    it('debounces: typing a word fires a single request after the user pauses', async () => {
      const user = userEvent.setup();
      renderApp();
      await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });

      await user.type(searchBox(), 'alpha');
      expect(searchCalls()).toHaveLength(0); // nothing sent while typing

      expect(await screen.findByRole('heading', { name: /results for “alpha”/i })).toBeInTheDocument();
      await waitFor(() => expect(titles()).toEqual(['Alpha Rising']));
      expect(searchCalls()).toHaveLength(1);
      expect(searchCalls()[0]).toContain('query=alpha');
    });

    it('does not search for blank input', async () => {
      const user = userEvent.setup();
      renderApp();
      await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });
      await user.type(searchBox(), '   ');
      await sleep(600);
      expect(searchCalls()).toHaveLength(0);
    });

    it('shows a helpful empty state when nothing matches, and can clear it', async () => {
      const user = userEvent.setup();
      renderApp();
      await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });
      await user.type(searchBox(), 'zzzz');

      expect(await screen.findByText(/no movies found/i)).toBeInTheDocument();
      expect(screen.getByText(/nothing matches “zzzz”/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear search & filters' }));
      expect(await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 })).toBeInTheDocument();
      expect(searchBox()).toHaveValue('');
    });

    it('never shows stale results when an older, slower request resolves last', async () => {
      const seen: (string | null)[] = [];
      server.use(
        http.get(`${API}/search/movie`, async ({ request }) => {
          const q = new URL(request.url).searchParams.get('query');
          seen.push(q);
          if (q === 'alpha') {
            await delay(900); // slow
            return HttpResponse.json({ page: 1, total_pages: 1, results: [RAW_MOVIES[0]] });
          }
          return HttpResponse.json({ page: 1, total_pages: 1, results: [RAW_MOVIES[1]] }); // fast
        }),
      );
      const user = userEvent.setup();
      renderApp();
      await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });

      await user.type(searchBox(), 'alpha');
      await waitFor(() => expect(screen.getByRole('status', { name: /searching/i })).toBeInTheDocument());
      await waitFor(() => expect(seen).toEqual(['alpha'])); // slow request is in flight

      await user.clear(searchBox());
      await user.type(searchBox(), 'beta');
      expect(await screen.findByRole('heading', { name: 'Beta Protocol', level: 3 })).toBeInTheDocument();

      await sleep(1200); // let the slow "alpha" response arrive
      expect(titles()).toEqual(['Beta Protocol']);
      expect(screen.queryByText('Alpha Rising')).not.toBeInTheDocument();
    });
  });

  describe('filters & sorting', () => {
    it('filters by release year using the API and can be reset', async () => {
      const user = userEvent.setup();
      renderApp();
      await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });

      await user.selectOptions(screen.getByLabelText(/release year/i), '2021');
      await waitFor(() => expect(titles()).toEqual(['Beta Protocol']));
      expect(requestLog.at(-1)).toContain('primary_release_year=2021');
      expect(screen.getByText('Year: 2021')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /reset filters/i }));
      await waitFor(() => expect(titles()).toEqual(['Alpha Rising', 'Beta Protocol', 'Gamma Ray']));
      expect(screen.getByLabelText(/release year/i)).toHaveValue('');
    });

    it.each([
      ['Popularity', ['Gamma Ray', 'Alpha Rising', 'Beta Protocol']],
      ['Rating', ['Beta Protocol', 'Alpha Rising', 'Gamma Ray']],
      ['Release date', ['Gamma Ray', 'Alpha Rising', 'Beta Protocol']],
    ])('sorts by %s', async (label, expected) => {
      const user = userEvent.setup();
      renderApp();
      await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });

      await user.selectOptions(screen.getByLabelText(/sort by/i), label);
      await waitFor(() => expect(titles()).toEqual(expected));
    });

    it('combines year and sort', async () => {
      const user = userEvent.setup();
      renderApp('/?year=2024&sort=rating');
      await waitFor(() => expect(titles()).toEqual(['Gamma Ray']));
      expect(screen.getByLabelText(/release year/i)).toHaveValue('2024');
      expect(screen.getByLabelText(/sort by/i)).toHaveValue('rating');
      await user.click(screen.getByRole('button', { name: /reset filters/i }));
      await waitFor(() => expect(titles()).toHaveLength(3));
    });

    it('sorts search results client-side without re-requesting', async () => {
      const user = userEvent.setup();
      renderApp('/?q=a'); // matches all three fixtures
      await waitFor(() => expect(titles()).toEqual(['Alpha Rising', 'Beta Protocol', 'Gamma Ray']));
      expect(searchCalls()).toHaveLength(1);

      await user.selectOptions(screen.getByLabelText(/sort by/i), 'Rating');
      expect(titles()).toEqual(['Beta Protocol', 'Alpha Rising', 'Gamma Ray']);
      await user.selectOptions(screen.getByLabelText(/sort by/i), 'Release date');
      expect(titles()).toEqual(['Gamma Ray', 'Alpha Rising', 'Beta Protocol']);
      expect(searchCalls()).toHaveLength(1);
    });

    it('ignores garbage in URL parameters', async () => {
      renderApp('/?year=abcd&sort=hax');
      await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });
      expect(screen.getByLabelText(/release year/i)).toHaveValue('');
      expect(requestLog[0]).toContain('/trending/');
    });
  });

  it('keeps the search when navigating to a movie and back', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/?q=alpha');
    await screen.findByRole('heading', { name: 'Alpha Rising', level: 3 });

    await user.click(screen.getByRole('link', { name: /alpha rising/i }));
    expect(await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/movie/1');

    await user.click(screen.getByRole('button', { name: /back/i }));
    await screen.findByRole('heading', { name: 'Alpha Rising', level: 3 });
    expect(searchBox()).toHaveValue('alpha');
    expect(router.state.location.search).toBe('?q=alpha');
  });
});
