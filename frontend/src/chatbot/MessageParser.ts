// src/chatbot/MessageParser.ts
import { faqItems, FAQItem } from "../faq/faqData";
import { isJapanese } from "../faq/languageUtils";

class MessageParser {
  actionProvider: any;

  constructor(actionProvider: any) {
    this.actionProvider = actionProvider;
  }

  parse(message: string) {
    console.log("MessageParser: User typed:", message);
    const langIsJapanese = isJapanese(message);
    const lowerCaseMessage = message.toLowerCase();
    let matchedFAQ: FAQItem | null = null;

    // FAQ項目ごとに、キーワードが含まれているかチェック
    for (const item of faqItems) {
      for (const keyword of item.keywords) {
        if (lowerCaseMessage.includes(keyword.toLowerCase())) {
          matchedFAQ = item;
          break;
        }
      }
      if (matchedFAQ) break;
    }

    if (matchedFAQ) {
      // 言語に合わせた回答候補を選ぶ
      const answers = langIsJapanese ? matchedFAQ.answers.ja : matchedFAQ.answers.en;
      const randomIndex = Math.floor(Math.random() * answers.length);
      const chosenAnswer = answers[randomIndex];
      console.log("Matched FAQ answer:", chosenAnswer);
      this.actionProvider.faqResponse(chosenAnswer);
    } else {
      console.log("No FAQ match. Using default response.");
      this.actionProvider.defaultResponse();
    }
  }
}

export default MessageParser;
