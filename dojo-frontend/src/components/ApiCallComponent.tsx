import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { isAxiosError } from '../utils/isAxiosError';
import { ChatResponse } from '../types';

export interface ApiCallComponentProps {
  previousStep: { value: string };
  triggerNext: () => void;
  accessToken: string | null;
  sessionId: string;
}

const ApiCallComponent: React.FC<ApiCallComponentProps> = ({
  previousStep,
  triggerNext,
  accessToken,
  sessionId,
}) => {
  const [responseMessage, setResponseMessage] = useState<string>('少々お待ちください…');

  useEffect(() => {
    const fetchResponse = async () => {
      const apiUrl = process.env.REACT_APP_CHATBOT_API_URL?.trim();
      if (!apiUrl) {
        setResponseMessage('サーバー設定に問題があります。');
        triggerNext();
        return;
      }
      try {
        const response = await axios.post<ChatResponse>(
          apiUrl,
          { message: previousStep.value, session: sessionId },
          {
            headers: { Authorization: accessToken ? `Bearer ${accessToken}` : '' },
          }
        );
        setResponseMessage(response.data.reply);
      } catch (error: unknown) {
        if (isAxiosError(error)) {
          setResponseMessage('チャットボット通信エラーが発生しました。再度お試しください。');
        } else {
          setResponseMessage('予期しないエラーが発生しました。');
        }
      } finally {
        triggerNext();
      }
    };

    fetchResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousStep.value]);

  return <div>{responseMessage}</div>;
};

export default ApiCallComponent;
