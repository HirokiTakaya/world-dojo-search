// src/i18n/index.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 翻訳ファイルをインポート
import translationEN from './locales/en/translation.json';
import translationJA from './locales/ja/translation.json';

// 翻訳リソースの定義
const resources = {
  en: {
    translation: translationEN
  },
  ja: {
    translation: translationJA
  }
};

i18n
  // 言語検出プラグインを使用
  .use(LanguageDetector)
  // `i18n` インスタンスを `react-i18next` に渡す
  .use(initReactI18next)
  // `i18next` を初期化
  .init({
    resources,
    fallbackLng: 'en', // 検出された言語が利用できない場合のフォールバック言語

    interpolation: {
      escapeValue: false // ReactはXSSから自動的に保護されるためエスケープは不要
    }
  });

export default i18n;
