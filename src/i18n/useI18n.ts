import { createContext, useContext } from 'react';
import { TmdbError } from '../services/tmdb';
import { LANGUAGES, translate } from './translations';
import type { Lang, TranslationKey } from './translations';

export interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** BCP-47 tag for Intl/date formatting. */
  locale: string;
  /** `language` query parameter for TMDB. */
  tmdbLanguage: string;
  dir: 'ltr' | 'rtl';
  /** Localised, user-friendly text for any error thrown by the TMDB service. */
  errorText: (error: unknown) => string;
}

export function buildI18n(lang: Lang, setLang: (lang: Lang) => void): I18n {
  const meta = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]!;
  const t: I18n['t'] = (key, vars) => translate(lang, key, vars);
  return {
    lang,
    setLang,
    t,
    locale: meta.locale,
    tmdbLanguage: meta.tmdb,
    dir: meta.dir,
    errorText: (error) => t(error instanceof TmdbError ? (`error.${error.kind}` as TranslationKey) : 'error.http'),
  };
}

/** Without a provider (e.g. isolated component tests) everything falls back to English. */
export const I18nContext = createContext<I18n>(buildI18n('en', () => {}));

export function useI18n(): I18n {
  return useContext(I18nContext);
}
