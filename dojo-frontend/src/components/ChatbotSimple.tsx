// src/components/ChatbotSimple.tsx
import React, { useState } from "react";
import Chatbot, { createChatBotMessage } from "react-chatbot-kit";
import { useTranslation } from "react-i18next";

import config from "../chatbot/Config";
import MessageParser from "../chatbot/MessageParser";
import ActionProvider from "../chatbot/ActionProvider";
import "../styles/chatbot-overrides.css"; // CSSインポート（最終調整済み）

interface ChatbotSimpleProps {
  accessToken?: string | null;
}

const ChatbotSimple: React.FC<ChatbotSimpleProps> = ({ accessToken }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleChatbot = () => setIsOpen((prev) => !prev);

  const dynamicConfig = {
    botName: t("supportBot", "サポートBot"),
    initialMessages: [
      createChatBotMessage(t("welcomeMessage", "こんにちは！気軽に何でも聞いてください。")),
    ],
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end">
      {/* チャットを開くボタン */}
      {!isOpen && (
        <button
          onClick={toggleChatbot}
          className={`
            bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg
            py-1 px-2 text-xs sm:py-2 sm:px-4 sm:text-base transition-colors duration-200
          `}
        >
          💬
        </button>
      )}

      {/* チャットウィンドウ（短めに調整） */}
      {isOpen && (
        <div
          className={`
            mt-2 w-[90vw] max-w-[320px] sm:w-80 bg-white rounded-lg shadow-xl flex flex-col 
            h-[50vh] sm:h-[60vh] border border-gray-200 overflow-hidden
          `}
        >
          {/* ヘッダー */}
          <div className="p-2 bg-blue-600 text-white flex justify-between items-center">
            <span className="font-semibold text-xs sm:text-base">
              {t("supportBot", "サポートBot")}
            </span>
            <button 
              onClick={toggleChatbot} 
              className="text-white font-bold text-xs sm:text-base hover:text-gray-200 transition-colors duration-200"
            >
              {t("closeChatbot", "閉じる")}
            </button>
          </div>

          {/* メッセージと入力欄 */}
          <div className="flex-1 overflow-y-auto">
            <Chatbot
              key={i18n.language}
              config={dynamicConfig}
              messageParser={MessageParser}
              actionProvider={ActionProvider}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotSimple;
