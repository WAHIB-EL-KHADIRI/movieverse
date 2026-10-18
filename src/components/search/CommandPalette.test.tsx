import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { API, server } from '../../test/server';
import { renderApp } from '../../test/utils';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const palette = () => screen.getByRole('dialog', { name: /quick search/i });
const input = () => screen.getByRole('combobox', { name: /search movies/i });

describe('Command palette', () => {
  it('opens with Ctrl+K, focuses the input, and closes with Escape restoring focus', async () => {
    const user = userEvent.setup();
    renderApp('/favorites');
    const trigger = screen.getByRole('button', { name: /open quick search/i });
    trigger.focus();

    await user.keyboard('{Control>}k{/Control}');
    expect(palette()).toBeInTheDocument();
    expect(input()).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('opens from the header button and closes on backdrop click', async () => {
    const user = userEvent.setup();
    renderApp('/favorites');
    await user.click(screen.getByRole('button', { name: /open quick search/i }));
    expect(palette()).toBeInTheDocument();
    await user.click(palette().parentElement!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('searches (debounced), supports arrow keys, and Enter opens the selected movie', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/favorites');
    await user.keyboard('{Control>}k{/Control}');
    expect(within(palette()).getByRole('status')).toHaveTextContent(/type to search/i);

    await user.type(input(), 'a'); // matches all three fixtures
    const options = await within(palette()).findAllByRole('option');
    expect(options.map((o) => o.querySelector('strong')?.textContent)).toEqual(['Alpha Rising', 'Beta Protocol', 'Gamma Ray']);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input()).toHaveAttribute('aria-activedescendant', options[0]!.id);

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(within(palette()).getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}'); // wraps
    expect(within(palette()).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}'); // wraps back
    expect(within(palette()).getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    expect(router.state.location.pathname).toBe('/movie/3');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a result on click', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/favorites');
    await user.keyboard('{Control>}k{/Control}');
    await user.type(input(), 'beta');
    await user.click(await screen.findByRole('option', { name: /beta protocol/i }));
    expect(router.state.location.pathname).toBe('/movie/2');
  });

  it('shows a message when nothing matches and when the request fails', async () => {
    const user = userEvent.setup();
    renderApp('/favorites');
    await user.keyboard('{Control>}k{/Control}');

    await user.type(input(), 'zzzz');
    await waitFor(() => expect(within(palette()).getByRole('status')).toHaveTextContent(/no movies found for “zzzz”/i));

    server.use(http.get(`${API}/search/movie`, () => new HttpResponse(null, { status: 500 })));
    await user.clear(input());
    await user.type(input(), 'boom');
    await waitFor(() => expect(within(palette()).getByRole('status')).toHaveTextContent(/TMDB is having trouble/i));
  });

  it('never shows results of an older query after a newer one', async () => {
    server.use(
      http.get(`${API}/search/movie`, async ({ request }) => {
        const q = new URL(request.url).searchParams.get('query');
        if (q === 'alpha') {
          await sleep(900);
          return HttpResponse.json({ page: 1, total_pages: 1, results: [{ id: 1, title: 'Alpha Rising' }] });
        }
        return HttpResponse.json({ page: 1, total_pages: 1, results: [{ id: 2, title: 'Beta Protocol' }] });
      }),
    );
    const user = userEvent.setup();
    renderApp('/favorites');
    await user.keyboard('{Control>}k{/Control}');

    await user.type(input(), 'alpha');
    await waitFor(() => expect(within(palette()).getByRole('status')).toHaveTextContent(/searching/i));
    await user.clear(input());
    await user.type(input(), 'beta');
    expect(await screen.findByRole('option', { name: /beta protocol/i })).toBeInTheDocument();

    await sleep(1200);
    expect(screen.queryByRole('option', { name: /alpha rising/i })).not.toBeInTheDocument();
  });
});
