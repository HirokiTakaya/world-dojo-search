// src/chatbot/Config.ts
import { createChatBotMessage } from "react-chatbot-kit";

const config = {
  botName: "",
  initialMessages: [
    createChatBotMessage("Hi!"),
  ],
  disableUserInput: false,
};

export default config;
