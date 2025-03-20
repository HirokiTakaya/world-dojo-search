// src/chatbot/ActionProvider.ts
import { createChatBotMessage } from "react-chatbot-kit";

class ActionProvider {
  createChatBotMessage: (text: string, options?: any) => any;
  setState: (state: any) => void;

  constructor(
    createChatBotMessage: (text: string, options?: any) => any,
    setState: (state: any) => void
  ) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setState;
  }

  // FAQに基づく回答を返すメソッド
  faqResponse(answer: string) {
    const message = this.createChatBotMessage(answer, {});
    this.setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }

  // FAQにマッチしなかった場合のデフォルト回答
  defaultResponse() {
    const message = this.createChatBotMessage("申し訳ありませんが、その質問にはお答えできません。", {});
    this.setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }
}

export default ActionProvider;
