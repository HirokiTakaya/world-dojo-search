// src/LoginComponents/SignUpScreen.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

export interface SignUpScreenProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
}

/* 
  1. PageWrapper：ページ全体をスクロール可能にし、position: relative; overflow: auto;
  2. BackgroundImage：position: fixed; z-index: -1; で背面に固定表示
  3. Container：z-index: 1; で前面にフォームを表示
*/

/* ページ全体のラッパコンテナ */
const PageWrapper = styled.div`
  position: relative;
  min-height: 100vh;
  overflow: auto;
`;

/* 背面の固定画像 */
const BackgroundImage = styled.img`

 position: fixed;
  bottom:44%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 350px;
  opacity: 0.8;
  pointer-events: none;
  filter: drop-shadow(0 0 4px #ffffff);

  /* 全要素の背面に回す */
  z-index: 0;

   /* モバイル用にロゴ縮小 */
   @media (max-width: 768px) {
   display:none;
     bottom:25%;
       max-width: 180px;
       
     
   }
`;

/* フォームコンテナ（前面） */
const Container = styled.div`
  position: relative;
  z-index: 1;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  min-height: 100vh;
  padding: 0 20px;
  box-sizing: border-box;
`;

/* タイトル */
const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 25px;
`;

/* 入力欄 */
const Input = styled.input`
  width: 100%;
  max-width: 400px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid gray;
  border-radius: 5px;
  font-size: 16px;
  box-sizing: border-box;

  &:focus {
    border-color: skyblue;
    outline: none;
  }
`;

/* ボタン */
const Button = styled.button`
  background-color: skyblue;
  padding: 12px 20px;
  border-radius: 5px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  margin-top: 10px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;

  &:disabled {
    background-color: lightgray;
    cursor: not-allowed;
  }
`;

/* エラーメッセージ */
const ErrorMessage = styled.p`
  color: red;
  margin-top: 10px;
  font-size: 16px;
`;

/* ログイン画面へのリンク */
const LoginLink = styled.p`
  margin-top: 20px;
  font-size: 16px;
  text-align: center;

  a {
    color: blue;
    text-decoration: none;
    font-weight: bold;

    &:hover {
      color: darkblue;
    }
  }
`;

const SignUpScreen: React.FC<SignUpScreenProps> = ({ setIsLoggedIn }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // トークンチェック
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
      navigate('/home');
    } else {
      setIsLoggedIn(false);
    }
  }, [navigate, setIsLoggedIn]);

  // フォーム入力状態
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // サインアップ実行
  const handleSignUp = async () => {
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      setLoading(false);
      return;
    }

    try {
      const payload = { email, password };
      const response = await fetch('https://hiroki-jiujitsu.azurewebsites.net/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        setIsLoggedIn(true);
        navigate('/home');
      } else {
        const errorData = await response.json();
        const errorMessage =
          errorData.detail || (errorData.username ? errorData.username[0] : t('signUpFailed'));
        setError(errorMessage);
      }
    } catch (err) {
      setError(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      {/* 背景画像 */}
      <BackgroundImage src="/images/jiujitsuLogo2.png" alt="Jiu Jitsu Logo" />

      {/* フォーム */}
      <Container>
        <Title>{t('signUp')}</Title>

        <Input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder={t('confirmPassword')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button onClick={handleSignUp} disabled={loading}>
          {loading ? t('signingUp') : t('signUpButton')}
        </Button>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <LoginLink>
          {t('alreadyHaveAccount')} <Link to="/">{t('login')}</Link>
        </LoginLink>
      </Container>
    </PageWrapper>
  );
};

export default SignUpScreen;
