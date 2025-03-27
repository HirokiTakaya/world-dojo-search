// src/LoginComponents/SignUpScreen.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

// 親コンポーネントから受け取るpropsに setAccessToken を追加
export interface SignUpScreenProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
};

const PageWrapper = styled.div`
  padding-top:6rem;
  position: relative;
  width: 100%;
  height: 100%;

  @media (max-width: 768px) {
    padding-top:2rem !important;
  }
`;

const BackgroundImage = styled.img`
  position: fixed;
  bottom: 44%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 350px;
  opacity: 0.8;
  pointer-events: none;
  filter: drop-shadow(0 0 4px #ffffff);
  z-index: 0;
  @media (max-width: 768px) {
    display: none;
  }
`;

const Container = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 20px;
`;

//
// ▼ ここからサイズ調整部分 ▼
//
const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 20px;
`;

const Input = styled.input`
  width: 100%;
  max-width: 350px;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid gray;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  &:focus {
    border-color: skyblue;
    outline: none;
  }
`;

const Button = styled.button`
  background-color: skyblue;
  padding: 10px 16px;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  margin-top: 8px;
  width: 100%;
  max-width: 350px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;

  &:disabled {
    background-color: lightgray;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  margin-top: 10px;
  font-size: 14px;
`;

const LoginLink = styled.p`
  margin-top: 15px;
  font-size: 14px;
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
//
// ▲ ここまでサイズ調整部分 ▲
//

const SignUpScreen: React.FC<SignUpScreenProps> = ({ setIsLoggedIn, setAccessToken }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ❶ body のスクロールを止める
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // 止める

    return () => {
      // ページを離れるときに元に戻す
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // ログイン済みなら /home に飛ばす
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
      setAccessToken(token); // <--- すでにあるトークンを親のstateにも反映
      navigate('/home');
    } else {
      setIsLoggedIn(false);
    }
  }, [navigate, setIsLoggedIn, setAccessToken]);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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
        // 親ステートにもセット（ログイン状態＆accessToken）
        setIsLoggedIn(true);
        setAccessToken(data.access);

        navigate('/home');
      } else {
        const errorData = await response.json();
        const errorMessage =
          errorData.detail ||
          (errorData.username ? errorData.username[0] : t('signUpFailed'));
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
      <BackgroundImage src="/images/jiujitsuLogo2.png" alt="Jiu Jitsu Logo" />
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
