// src/chatbot/Config.ts
import { createChatBotMessage } from "react-chatbot-kit";

const config = {
  botName: "サポートBot",
  initialMessages: [
    createChatBotMessage("こんにちは！気軽に何でも聞いてください。", {})
  ],
  customStyles: {
    botMessageBox: {
      backgroundColor: "#376B7E",
      fontSize: window.innerWidth < 640 ? "12px" : "14px",
      padding: window.innerWidth < 640 ? "0.5rem" : "1rem",
    },
    userMessageBox: {
      fontSize: window.innerWidth < 640 ? "12px" : "14px",
      padding: window.innerWidth < 640 ? "0.5rem" : "1rem",
    },
    // 入力欄に関する設定がある場合は追加
  },
};

export default config;
