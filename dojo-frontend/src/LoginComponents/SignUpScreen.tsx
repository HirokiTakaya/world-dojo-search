import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
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

export interface SignUpScreenProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ setIsLoggedIn }) => {
  const { t } = useTranslation();
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

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSignUp = async () => {
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      setLoading(false);
      return;
    }

    try {
      const payload = { email, password };

      const response = await fetch('https://hiroki-jiujitsu.azurewebsites.net/api/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        const errorMessage = errorData.detail || (errorData.username ? errorData.username[0] : t("signUpFailed"));
        setError(errorMessage);
      }
    } catch (err) {
      setError(t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Title>{t("signUp")}</Title>
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
      <Input
        type="password"
        placeholder={t("confirmPassword")}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <Button onClick={handleSignUp} disabled={loading}>
        {loading ? t("signingUp") : t("signUpButton")}
      </Button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <LoginLink>
        {t("alreadyHaveAccount")} <Link to="/">{t("login")}</Link>
      </LoginLink>
    </Container>
  );
};

export default SignUpScreen;
