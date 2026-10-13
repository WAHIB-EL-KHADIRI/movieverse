import { screen, waitFor } from '@testing-library/react';
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
