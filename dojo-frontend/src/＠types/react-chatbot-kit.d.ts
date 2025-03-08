// src/@types/react-chatbot-kit.d.ts

declare module "react-chatbot-kit" {
    import * as React from "react";
  
    export interface ChatbotProps {
      config: any;
      messageParser: any;
      actionProvider: any;
      floating?: boolean;
    }
  
    export function createChatBotMessage(message: string, options?: any): any;
  
    // 必要最低限の型定義を記述
    const Chatbot: React.FC<ChatbotProps>;
    export default Chatbot;
  }
  