'use client';

import Cookies from 'universal-cookie';
import en from '../public/locales/en.json';
import ae from '../public/locales/ae.json';
import da from '../public/locales/da.json';
import de from '../public/locales/de.json';
import el from '../public/locales/el.json';
import es from '../public/locales/es.json';
import fr from '../public/locales/fr.json';
import hu from '../public/locales/hu.json';
import it from '../public/locales/it.json';
import ja from '../public/locales/ja.json';
import pl from '../public/locales/pl.json';
import pt from '../public/locales/pt.json';
import ru from '../public/locales/ru.json';
import sv from '../public/locales/sv.json';
import tr from '../public/locales/tr.json';
import zh from '../public/locales/zh.json';

const languages = { en, ae, da, de, el, es, fr, hu, it, ja, pl, pt, ru, sv, tr, zh };
type Language = keyof typeof languages;

function isLanguage(value: string | undefined): value is Language {
  return Boolean(value && value in languages);
}

const cookies = new Cookies(null, { path: '/' });

export const getTranslation = () => {
  const selected = cookies.get<string>('i18nextLng');
  const language: Language = isLanguage(selected) ? selected : 'en';
  const data = languages[language] as Record<string, string>;

  const i18n = {
    language,
    changeLanguage: (nextLanguage: string) => {
      if (isLanguage(nextLanguage)) cookies.set('i18nextLng', nextLanguage);
    },
  };

  return {
    t: (key: string) => data[key] ?? key,
    i18n,
    initLocale: (themeLocale: string) => i18n.changeLanguage(themeLocale),
  };
};
