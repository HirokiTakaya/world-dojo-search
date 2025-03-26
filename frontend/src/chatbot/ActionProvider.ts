// src/chatbot/ActionProvider.ts
import i18next from "i18next";

class ActionProvider {
  createChatBotMessage: (message: string) => any;
  setState: any;

  constructor(createChatBotMessage: any, setStateFunc: any) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
  }

  // FAQ一致時の応答を送信
  sendFAQMessage(answer: string) {
    const message = this.createChatBotMessage(answer);
    this.updateChatbotState(message);
  }

  // FAQにマッチしなかったときのデフォルト応答
  defaultResponse() {
    const fallback = i18next.t(
      "defaultResponse",
      "申し訳ありませんが、その内容には対応できません。"
    );
    const message = this.createChatBotMessage(fallback);
    this.updateChatbotState(message);
  }

  // ステートを更新（共通）
  updateChatbotState(message: any) {
    this.setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }
}

export default ActionProvider;
