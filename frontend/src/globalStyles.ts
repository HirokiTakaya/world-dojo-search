// src/globalStyles.ts
import { createGlobalStyle } from 'styled-components';

export const BaseResetStyle = createGlobalStyle`
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    /* ここでは overflow: hidden; は指定しない（常時オフにはしない） */
    /* 代わりに「ログイン系画面マウント時に」JSで切り替える */
  }

  #root {
    width: 100%;
    height: 100%;
  }
`;
