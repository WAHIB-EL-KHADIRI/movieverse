import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API, requestLog, server } from '../test/server';
import { renderApp } from '../test/utils';
import { formatReleaseDate, formatRuntime } from '../utils/format';
import { LANGUAGE_STORAGE_KEY, detectLanguage } from './detect';
import { DICTIONARIES, LANGUAGES, en, translate } from './translations';
import type { Lang } from './translations';

afterEach(() => {
  document.documentElement.lang = '';
  document.documentElement.dir = '';
});

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  it.each(LANGUAGES.map((l) => l.code))('%s has every key, no empty strings and the same placeholders as English', (code) => {
    const dict = DICTIONARIES[code];
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(dict[key], `${code}:${key}`).toBeTruthy();
      expect(placeholders(dict[key]), `${code}:${key} placeholders`).toEqual(placeholders(en[key]));
    }
    expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
  });

  it('interpolates variables and leaves unknown placeholders untouched', () => {
    expect(translate('en', 'hero.show', { title: 'Alien' })).toBe('Show Alien');
    expect(translate('fr', 'nav.savedBadge', { n: 3 })).toBe('3 enregistrés');
    expect(translate('en', 'hero.show')).toBe('Show {title}');
  });

  it('declares right-to-left only for Arabic', () => {
    expect(LANGUAGES.filter((l) => l.dir === 'rtl').map((l) => l.code)).toEqual(['ar']);
  });
});

describe('language detection', () => {
  const setBrowser = (lang: string) => vi.spyOn(navigator, 'language', 'get').mockReturnValue(lang);

  it('uses the browser language when supported, otherwise English', () => {
    setBrowser('fr-MA');
    expect(detectLanguage()).toBe('fr');
    setBrowser('ar-EG');
    expect(detectLanguage()).toBe('ar');
    setBrowser('de-DE');
    expect(detectLanguage()).toBe('en');
  });

  it('prefers a saved choice and ignores invalid saved values', () => {
    setBrowser('fr');
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ar');
    expect(detectLanguage()).toBe('ar');
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'klingon');
    expect(detectLanguage()).toBe('fr');
  });

  it('survives blocked storage', () => {
    setBrowser('en-US');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(detectLanguage()).toBe('en');
  });
});

describe('locale-aware formatting', () => {
  it('localises runtime units and dates', () => {
    expect(formatRuntime(135, { h: 'س', m: 'د', unknown: '?' })).toBe('2س 15د');
    expect(formatRuntime(null, { h: 'h', m: 'min', unknown: 'Durée inconnue' })).toBe('Durée inconnue');
    expect(formatReleaseDate('2023-05-10', 'fr-FR')).toMatch(/mai/i);
    expect(formatReleaseDate('', 'fr-FR', 'Date inconnue')).toBe('Date inconnue');
  });
});

describe('switching language in the app', () => {
  const pick = async (user: ReturnType<typeof userEvent.setup>, lang: Lang) =>
    user.selectOptions(screen.getByRole('combobox', { name: /language|langue|اللغة/i }), lang);

  it('defaults to English (LTR) and shows the language switcher', () => {
    renderApp();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  });

  it('switches the interface to Arabic, flips the layout to RTL and remembers the choice', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });

    await pick(user, 'ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');

    const nav = screen.getByRole('navigation', { name: 'الرئيسية' });
    expect(within(nav).getByRole('link', { name: 'الرائج' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'المفضلة' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'الرائج هذا الأسبوع', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'ابحث عن فيلم بالعنوان' })).toBeInTheDocument();
  });

  it('asks TMDB for content in the chosen language and refetches when it changes', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });
    expect(requestLog[0]).toContain('language=en-US');

    await pick(user, 'fr');
    await waitFor(() => expect(requestLog.some((r) => r.includes('/trending/') && r.includes('language=fr-FR'))).toBe(true));
    await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 });

    await pick(user, 'ar');
    await waitFor(() => expect(requestLog.some((r) => r.includes('language=ar'))).toBe(true));
  });

  it('translates movie details, dates and the runtime, and requests details in French', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    renderApp('/movie/1');
    expect(await screen.findByRole('heading', { name: 'Alpha Rising', level: 1 })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Ajouter aux favoris' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Synopsis' })).toBeInTheDocument();
    expect(screen.getByText('2h 15min')).toBeInTheDocument();
    expect(screen.getByText(/mai 2023/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir la bande-annonce' })).toBeInTheDocument();
    expect(requestLog.find((r) => r.startsWith('/movie/1'))).toContain('language=fr-FR');
    expect(requestLog.find((r) => r.startsWith('/movie/1'))).toContain('include_video_language=fr%2Cen%2Cnull');
  });

  it('translates error messages', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    server.use(http.get(`${API}/trending/movie/week`, () => new HttpResponse(null, { status: 500 })));
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('TMDB rencontre des difficultés');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });

  it('translates the favorites page, including the empty state', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ar');
    renderApp('/favorites');
    expect(screen.getByRole('heading', { name: 'لا توجد مفضلات بعد' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'مفضلتك', level: 1 })).toBeInTheDocument();
  });

  it('translates the command palette', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    const user = userEvent.setup();
    renderApp('/favorites');
    await user.keyboard('{Control>}k{/Control}');
    const dialog = screen.getByRole('dialog', { name: 'Recherche rapide' });
    expect(within(dialog).getByRole('status')).toHaveTextContent('Tapez pour chercher');
  });

  it('keeps movie titles untranslated and ratings readable in every language', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ar');
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Gamma Ray', level: 3 })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'التقييم 7.2 من 10' }).length).toBeGreaterThan(0);
  });
});
