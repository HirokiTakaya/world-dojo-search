// src/faq/languageUtils.ts
export function isJapanese(text: string): boolean {
    // Unicode の日本語文字範囲（ひらがな、カタカナ、漢字など）をチェック
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf\uF900-\uFAFF]/.test(text);
  }
  