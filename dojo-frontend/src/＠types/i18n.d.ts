import 'react-i18next';

declare module 'react-i18next' {
  interface Resources {
    en: typeof import('../i18n/locales/en/translation.json');
    ja: typeof import('../i18n/locales/ja/translation.json');
  }
}