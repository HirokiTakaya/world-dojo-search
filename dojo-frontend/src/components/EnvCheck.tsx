// src/components/EnvCheck.tsx

import React from 'react';

const EnvCheck: React.FC = () => {
  return (
    <div>
      <h2>環境変数の確認</h2>
      <p>REACT_APP_BACKEND_URL: {process.env.REACT_APP_BACKEND_URL}</p>
      <p>REACT_APP_CHATBOT_API_URL: {process.env.REACT_APP_CHATBOT_API_URL}</p>
    </div>
  );
};

export default EnvCheck;
