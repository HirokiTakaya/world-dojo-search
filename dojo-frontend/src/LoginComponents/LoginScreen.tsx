// src/LoginComponents/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
// jwt-decode は名前付きインポートとして利用
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 0 20px;
  box-sizing: border-box;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 25px;
`;

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

const ErrorMessage = styled.p`
  color: red;
  margin-top: 10px;
  font-size: 16px;
`;

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

type LoginScreenProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
};

type DecodedToken = {
  email: string;
  name: string;
  picture: string;
  exp: number;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ setIsLoggedIn }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
      navigate('/home');
    } else {
      setIsLoggedIn(false);
    }
  }, [navigate, setIsLoggedIn]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://hiroki-jiujitsu.azurewebsites.net/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (!credentialResponse || !credentialResponse.credential) {
        setError(t("googleCredentialError"));
        return;
      }

      const token = credentialResponse.credential;
      const decoded: DecodedToken = jwtDecode(token);
      console.log('Decoded Google Token:', decoded);

      // バックエンドが必要とするフィールドをペイロードに含める
      const payload = {
        token,             // 取得したトークン
        email: decoded.email, // decoded.email を含める例
      };

      const res = await fetch('https://hiroki-jiujitsu.azurewebsites.net/api/google-login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        <div style={{ marginTop: '20px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError(t("googleLoginFailed"))}
          />
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <SignUpLink>
          {t("alreadyHaveAccount")} <Link to="/signup">{t("signUp")}</Link>
        </SignUpLink>
      </Container>
    </GoogleOAuthProvider>
  );
};

export default LoginScreen;
