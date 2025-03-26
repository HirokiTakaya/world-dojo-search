// src/components/ChatbotSimple.tsx
import React, { useState } from "react";
import Chatbot, { createChatBotMessage } from "react-chatbot-kit";
import { useTranslation } from "react-i18next";

import MessageParser from "../chatbot/MessageParser";
import ActionProvider from "../chatbot/ActionProvider";
import "../styles/chatbot-overrides.css";

interface ChatbotSimpleProps {
  accessToken?: string | null;
}

const ChatbotSimple: React.FC<ChatbotSimpleProps> = ({ accessToken }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleChatbot = () => setIsOpen((prev) => !prev);

  // 動的コンフィグを正しく生成
  const dynamicConfig = {
    botName: "",
    disableUserInput: false,
    initialMessages: [
      createChatBotMessage(t("welcomeMessage", "こんにちは！気軽に何でも聞いてください。")),
    ],
  };

  return (
    <div className="chatbot-root-container">
      {!isOpen && (
        <button onClick={toggleChatbot} className="chatbot-open-btn">
          💬
        </button>
      )}

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span className="chatbot-title">
              {t("conversationWithSupportBot", "Conversation with Support Bot")}
            </span>
            <button onClick={toggleChatbot} className="chatbot-close-btn">
              &times;
            </button>
          </div>

          <div className="chatbot-body">
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
