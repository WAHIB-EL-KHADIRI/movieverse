import { LANGUAGES } from './translations';
import type { Lang } from './translations';

export const LANGUAGE_STORAGE_KEY = 'movieverse:lang';

export const isLang = (value: unknown): value is Lang => LANGUAGES.some((l) => l.code === value);

/** Saved choice → browser language → English. Never throws (storage can be blocked). */
export function detectLanguage(): Lang {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* ignore */
  }
  const preferred = (typeof navigator === 'undefined' ? '' : navigator.language).slice(0, 2).toLowerCase();
  return isLang(preferred) ? preferred : 'en';
}
