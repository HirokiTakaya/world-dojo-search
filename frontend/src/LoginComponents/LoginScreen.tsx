// src/LoginComponents/LoginScreen.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';

type DecodedToken = {
  email: string;
  name: string;
  picture: string;
  exp: number;
};

// 親から受け取るpropsに setAccessToken を追加
type LoginScreenProps = {
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
  height: 100%; /* PageWrapperを全て使う */
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

const SignUpLink = styled.p`
  margin-top: 15px;
  font-size: 14px;
  text-align: center;

  a {
    color: #007bff;
    text-decoration: none;
    font-weight: bold;
    &:hover {
      color: #0056b3;
    }
  }
`;
//
// ▲ ここまでサイズ調整部分 ▲
//

const LoginScreen: React.FC<LoginScreenProps> = ({ setIsLoggedIn, setAccessToken }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // ❶ body のスクロールを止める
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // スクロール禁止

    return () => {
      document.body.style.overflow = originalOverflow; // アンマウント時に戻す
    };
  }, []);

  // トークンあればリダイレクト
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
      setAccessToken(token); // すでにあるトークンを反映
      navigate('/home');
    } else {
      setIsLoggedIn(false);
    }
  }, [navigate, setIsLoggedIn, setAccessToken]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://hiroki-jiujitsu.azurewebsites.net/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);

        // 親ステートにもセット
        setIsLoggedIn(true);
        setAccessToken(data.access);

        navigate('/home');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || t('loginFailed'));
      }
    } catch {
      setError(t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (!credentialResponse || !credentialResponse.credential) {
        setError(t('googleCredentialError'));
        return;
      }
      const token = credentialResponse.credential;
      const decoded = jwtDecode(token) as DecodedToken;
      const payload = {
        token,
        email: decoded.email,
      };
      const res = await fetch('https://hiroki-jiujitsu.azurewebsites.net/api/google-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);

        // 親ステートにもセット
        setIsLoggedIn(true);
        setAccessToken(data.access);

        navigate('/home');
      } else {
        const errorData = await res.json();
        setError(errorData.detail || t('authenticationFailed'));
      }
    } catch {
      setError(t('unexpectedError'));
    }
  };

  return (
    <GoogleOAuthProvider clientId="622036220054-82ds5thkp53t4sqc5s1ac20ti3e55802.apps.googleusercontent.com">
      <PageWrapper>
        <BackgroundImage src="/images/jiujitsuLogo2.png" alt="Jiu Jitsu Logo" />
        <Container>
          <Title>{t('login')}</Title>
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
          <Button onClick={handleLogin} disabled={loading}>
            {loading ? t('loggingIn') : t('loginButton')}
          </Button>

          <div style={{ marginTop: '15px' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError(t('googleLoginFailed'))}
            />
          </div>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <SignUpLink>
            {t('alreadyHaveAccount')} <Link to="/signup">{t('signUp')}</Link>
          </SignUpLink>
        </Container>
      </PageWrapper>
    </GoogleOAuthProvider>
  );
};

export default LoginScreen;
