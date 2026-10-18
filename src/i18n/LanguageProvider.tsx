import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LANGUAGE_STORAGE_KEY, detectLanguage } from './detect';
import type { Lang } from './translations';
import { I18nContext, buildI18n } from './useI18n';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLanguage);

  const value = useMemo(() => {
    const setLang = (next: Lang) => {
      setLangState(next);
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      } catch {
        /* the choice still applies for this session */
      }
    };
    return buildI18n(lang, setLang);
  }, [lang]);

  // Keep <html lang dir> in sync: this flips the whole layout to right-to-left for Arabic.
  useEffect(() => {
    document.documentElement.lang = value.lang;
    document.documentElement.dir = value.dir;
  }, [value.lang, value.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
