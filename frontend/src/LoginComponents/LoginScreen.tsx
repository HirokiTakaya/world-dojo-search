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

type LoginScreenProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
};

/* 
  1. PageWrapper：ページ全体をスクロール可能にし、position: relative; overflow: auto;
  2. BackgroundImage：position: fixed; z-index: -1; で背面に固定表示
  3. Container：z-index: 1; でフォームを前面に表示
*/

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
    bottom:18%;
       max-width: 370px;
       
     
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

/* サインアップ画面へのリンク */
const SignUpLink = styled.p`
  margin-top: 20px;
  font-size: 16px;
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

const LoginScreen: React.FC<LoginScreenProps> = ({ setIsLoggedIn }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ログインフォームの入力状態
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // コンポーネント初期表示時
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
      navigate('/home');
    } else {
      setIsLoggedIn(false);
    }
  }, [navigate, setIsLoggedIn]);

  // ログインボタン押下時
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
        setIsLoggedIn(true);
        navigate('/home');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || t("loginFailed"));
      }
    } catch {
      setError(t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  // Google認証 成功時
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (!credentialResponse || !credentialResponse.credential) {
        setError(t("googleCredentialError"));
        return;
      }

      // 取得した ID トークンをデコード
      const token = credentialResponse.credential;
      const decoded: DecodedToken = jwtDecode(token);

      // バックエンドに送るデータ
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
        setIsLoggedIn(true);
        navigate('/home');
      } else {
        const errorData = await res.json();
        setError(errorData.detail || t("authenticationFailed"));
      }
    } catch {
      setError(t("unexpectedError"));
    }
  };

  return (
    <GoogleOAuthProvider clientId="622036220054-82ds5thkp53t4sqc5s1ac20ti3e55802.apps.googleusercontent.com">
      <PageWrapper>
        
        {/* 背景画像 */}
        <BackgroundImage src="/images/jiujitsuLogo2.png" alt="Jiu Jitsu Logo" />

        {/* フォーム本体 */}
        <Container>
          <Title>{t("login")}</Title>

          <Input
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button onClick={handleLogin} disabled={loading}>
            {loading ? t("loggingIn") : t("loginButton")}
          </Button>

          {/* Googleログインボタン */}
          <div style={{ marginTop: '20px' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError(t("googleLoginFailed"))}
            />
          </div>

          {/* エラー表示 */}
          {error && <ErrorMessage>{error}</ErrorMessage>}

          {/* サインアップリンク */}
          <SignUpLink>
            {t("alreadyHaveAccount")}{" "}
            <Link to="/signup">{t("signUp")}</Link>
          </SignUpLink>
        </Container>
      </PageWrapper>
    </GoogleOAuthProvider>
  );
};

export default LoginScreen;
