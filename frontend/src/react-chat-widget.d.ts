// src/react-chat-widget.d.ts

declare module 'react-chat-widget' {
    import * as React from 'react';
  
    interface WidgetProps {
      handleNewUserMessage: (message: string) => void;
      title?: string;
      subtitle?: string;
      senderPlaceHolder?: string;
      profileAvatar?: string;
      showCloseButton?: boolean;
      autofocus?: boolean;
      fullScreenMode?: boolean;
      badge?: number;
      handleToggle?: () => void;
      handleQuickButtonClicked?: (value: string) => void;
    }
  
    export const Widget: React.FC<WidgetProps>;
    export const addResponseMessage: (message: string) => void;
    export const addUserMessage: (message: string) => void;
    export const toggleWidget: () => void;
  }
  