// src/chatbot/MessageParser.ts
import { faqItems } from "../faq/faqData";
import i18next from "i18next";

class MessageParser {
  actionProvider: any;

  constructor(actionProvider: any) {
    this.actionProvider = actionProvider;
  }

  parse(message: string) {
    // ユーザー入力を小文字に変換しておく (大文字でもマッチするように)
    const userInput = message.toLowerCase();

    // 現在の言語を i18next から取得 (ja なら日本語, それ以外は en)
    const currentLang = i18next.language?.startsWith("ja") ? "ja" : "en";

    // FAQの中から一致するキーワードを探す
    for (const faq of faqItems) {
      for (const kw of faq.keywords) {
        if (userInput.includes(kw.toLowerCase())) {
          // 一致するキーワードが見つかった → FAQ の回答を取得
          const answers = faq.answers[currentLang] || faq.answers["ja"];
          // 回答候補が複数ある場合は先頭、またはランダムでもOK
          const answer = answers[0];

          // ActionProviderでメッセージ送信
          this.actionProvider.sendFAQMessage(answer);
          return; // 終了
        }
      }
    }

    // ここまでマッチしなければデフォルト応答を呼び出す
    this.actionProvider.defaultResponse();
  }
}

export default MessageParser;
