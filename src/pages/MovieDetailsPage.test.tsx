import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { API, requestLog, server } from '../test/server';
import { renderApp } from '../test/utils';

describe('Movie details page', () => {
  it('shows poster, title, overview, genres, runtime and rating', async () => {
    renderApp('/movie/1');
    expect(screen.getByText(/loading movie details/i)).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /poster of alpha rising/i })).toBeInTheDocument();
    expect(screen.getByText('The first film.')).toBeInTheDocument();
    expect(screen.getByText('2h 15m')).toBeInTheDocument();
    expect(screen.getByLabelText('Rated 7.2 out of 10')).toBeInTheDocument();
    expect(screen.getByText('May 10, 2023')).toBeInTheDocument();
    const genres = screen.getByRole('list', { name: /genres/i });
    expect(genres).toHaveTextContent('Action');
    expect(genres).toHaveTextContent('Science Fiction');
    // Set in a passive effect, so it may land a tick after the DOM commit.
    await waitFor(() => expect(document.title).toBe('Alpha Rising · MovieVerse'));
  });

  it('loads the trailer only on demand, from the privacy-friendly YouTube domain', async () => {
    const user = userEvent.setup();
    renderApp('/movie/1');
    await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 });

    expect(document.querySelector('iframe')).toBeNull(); // nothing loaded yet
    await user.click(screen.getByRole('button', { name: /watch trailer/i }));
    const frame = screen.getByTitle(/alpha rising — trailer/i);
    expect(frame).toHaveAttribute('src', expect.stringMatching(/^https:\/\/www\.youtube-nocookie\.com\/embed\/OFFICIAL_ab-1\?/));

    await user.click(screen.getByRole('button', { name: /close trailer/i }));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('hides the trailer button when the movie has no trailer', async () => {
    renderApp('/movie/3');
    await screen.findByRole('heading', { name: 'Gamma Ray', level: 1 });
    expect(screen.queryByRole('button', { name: /watch trailer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /top cast/i })).not.toBeInTheDocument();
  });

  it('shows the top cast with a fallback avatar when there is no photo', async () => {
    renderApp('/movie/1');
    expect(await screen.findByRole('heading', { name: /top cast/i })).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('The Hero')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('JS')).toBeInTheDocument(); // initials fallback
    expect(screen.queryByText('Broken')).not.toBeInTheDocument();
  });

  it('lists similar movies (excluding the current one) and navigates to them', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/movie/1');
    const grid = await screen.findByRole('list', { name: /similar movies/i });
    expect(within(grid).queryByRole('heading', { name: 'Alpha Rising' })).not.toBeInTheDocument();

    await user.click(within(grid).getByRole('link', { name: /beta protocol — view details/i }));
    expect(await screen.findByRole('heading', { name: 'Beta Protocol', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/movie/2');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it.each(['abc', '0', '-5', '1.5'])('rejects invalid id "%s" without calling the API', async (id) => {
    renderApp(`/movie/${id}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid movie id/i);
    expect(requestLog).toHaveLength(0);
  });

  it('shows "not found" for an unknown movie', async () => {
    renderApp('/movie/999999');
    expect(await screen.findByRole('alert')).toHaveTextContent(/movie not found/i);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('shows a retryable error when loading fails', async () => {
    let fail = true;
    server.use(
      http.get(`${API}/movie/1`, () =>
        fail
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json({ id: 1, title: 'Alpha Rising', overview: 'ok', genres: [], runtime: 0 }),
      ),
    );
    const user = userEvent.setup();
    renderApp('/movie/1');

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load this movie/i);
    fail = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Runtime unknown')).toBeInTheDocument();
  });

  it('copes with a movie that has no poster and no overview', async () => {
    renderApp('/movie/3');
    expect(await screen.findByRole('heading', { name: 'Gamma Ray', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /no poster available/i })).toBeInTheDocument();
  });

  it('shows the 404 page for unknown routes', () => {
    renderApp('/nope/nothing');
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});
