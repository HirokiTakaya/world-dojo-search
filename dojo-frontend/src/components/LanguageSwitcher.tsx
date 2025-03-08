// src/components/LanguageSwitcher.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

// もともと position: absolute で top/right 固定していたのを削除し、
// 単に横並び＆隙間だけ作るコンテナにする。
const SwitcherContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  /* position: absolute; は削除 */
  /* top, right の指定も削除 */
`;

const LanguageButton = styled.button`
  background-color: #3b82f6; /* Tailwind blue-500 */
  color: white;
  border: none;
  border-radius: 0.25rem; /* rounded-md */
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.875rem; /* text-sm */
  transition: background-color 0.3s;

  &:hover {
    background-color: #2563eb; /* Tailwind blue-600 */
  }

  &:focus {
    outline: 2px solid #007bff; /* Accessible focus indicator */
    outline-offset: 2px;
  }
`;

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <SwitcherContainer>
      <LanguageButton onClick={() => changeLanguage('en')}>English</LanguageButton>
      <LanguageButton onClick={() => changeLanguage('ja')}>日本語</LanguageButton>
    </SwitcherContainer>
  );
};

export default LanguageSwitcher;
