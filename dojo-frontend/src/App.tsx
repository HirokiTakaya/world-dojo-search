import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import ParticlesBackground from "./components/ParticlesBackground";
import LoginScreen from "./LoginComponents/LoginScreen";
import SignUpScreen from "./LoginComponents/SignUpScreen";
import Home from "./components/Home";
import FavoritesList from "./components/FavoritesList";
import useSpeechRecognition, { UseSpeechRecognitionResult } from "./components/useSpeechRecognition";
import { isAxiosError } from "./utils/isAxiosError";
import { Dojo } from "./types";
import api from "./utils/axiosInstance";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import "./i18n";
import LanguageSwitcher from "./components/LanguageSwitcher";
import PracticeCalendar from "./components/PracticeCalendar";
import EnvCheck from "./components/EnvCheck";
import ChatbotSimple from "./components/ChatbotSimple";

interface FetchDojoDataResponse {
  dojos: Dojo[];
}

// モバイル判定用カスタムフック
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(ua) || /iPad|iPhone|iPod/.test(ua)) {
      setIsMobile(true);
    }
  }, []);
  return isMobile;
};

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [region, setRegion] = useState<string>("");
  const [center, setCenter] = useState({ lat: 35.6895, lng: 139.6917 });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // i18n の言語に合わせて音声認識の言語を決定する（例: "ja" → "ja-JP", "en" → "en-US"）
  const mapLanguage = (lng: string): "ja-JP" | "en-US" => {
    return lng.startsWith("ja") ? "ja-JP" : "en-US";
  };
  const [speechLang, setSpeechLang] = useState<"ja-JP" | "en-US">(mapLanguage(i18n.language));

  // i18n の言語変更に応じて音声認識の言語も更新
  useEffect(() => {
    setSpeechLang(mapLanguage(i18n.language));
  }, [i18n.language]);

  const isMobile = useIsMobile();

  // useSpeechRecognition を呼び出す（speechLang に応じた認識）
  const speechRecognitionData: UseSpeechRecognitionResult = useSpeechRecognition((text: string) => {
    setRegion(text);
    handleSearch();
  }, speechLang);

  // モバイルの場合は音声認識機能を利用しないダミーオブジェクトを用意
  const dummySpeechRecognition: UseSpeechRecognitionResult = {
    startListening: () => {},
    stopListening: () => {},
    isListening: false,
    error: "",
    isSupported: false,
  };

  const effectiveSpeechRecognition = isMobile ? dummySpeechRecognition : speechRecognitionData;
  const { startListening, isListening, error: speechError } = effectiveSpeechRecognition;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsLoggedIn(Boolean(token));
    setAccessToken(token);
  }, []);

  const handleSearch = async () => {
    if (!region.trim()) {
      setError(t("searchRegionPrompt"));
      return;
    }
    setLoading(true);
    setError(null);
    setDojos([]);
    setCenter({ lat: 35.6895, lng: 139.6917 });

    try {
      const dojoResponse = await api.get<FetchDojoDataResponse>("/fetch_dojo_data/", {
        params: { query: region },
      });
      const { dojos } = dojoResponse.data;
      if (dojos && dojos.length > 0) {
        setDojos(dojos);
        const firstDojo = dojos[0];
        if (firstDojo.latitude !== null && firstDojo.longitude !== null) {
          setCenter({ lat: firstDojo.latitude, lng: firstDojo.longitude });
        }
      } else {
        setError(t("noDojosFound"));
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.error ?? t("errorFetchingData");
        setError(message);
      } else {
        setError(t("unexpectedError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsLoggedIn(false);
    setAccessToken(null);
  };

  return (
    <>
      <Router>
        <ParticlesBackground />
        <div className="flex flex-col h-screen overflow-hidden">
          <header className="fixed top-0 left-0 w-full bg-black/80 shadow-md z-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-4">
                <Link to="/" className="text-2xl font-bold text-white">
                  {t("home")}
                </Link>
                <Link to="/favorites" className="text-white">
                  {t("favorites")}
                </Link>
                <Link to="/practice" className="text-white">
                  {t("practiceCalendar")}
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <LanguageSwitcher />
                {/* ここには追加の音声入力ボタンは作成せず、Home コンポーネント内の音声入力ボタンが利用される想定です */}
                {isLoggedIn === null ? (
                  <p className="text-white">{t("checkingLoginStatus")}</p>
                ) : !isLoggedIn ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link to="/login" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                      {t("login")}
                    </Link>
                    <Link to="/signup" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                      {t("signup")}
                    </Link>
                  </div>
                ) : (
                  <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                    {t("logout")}
                  </button>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-black bg-opacity-50 p-4 pt-[270px]">
            <Routes>
              <Route path="/" element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />} />
              <Route path="/login" element={<LoginScreen setIsLoggedIn={setIsLoggedIn} />} />
              <Route path="/signup" element={<SignUpScreen setIsLoggedIn={setIsLoggedIn} />} />
              <Route
                path="/home"
                element={
                  <Home
                    dojos={dojos}
                    center={center}
                    loading={loading}
                    error={error}
                    region={region}
                    setRegion={setRegion}
                    handleSearch={handleSearch}
                    startListening={startListening}  // この startListening を用いて Home 内で音声入力ボタンを表示
                    isListening={isListening}
                    speechError={speechError}
                    accessToken={accessToken}
                  />
                }
              />
              <Route path="/favorites" element={<FavoritesList accessToken={accessToken} />} />
              <Route path="/practice" element={<PracticeCalendar />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <EnvCheck />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnHover
          draggable
          theme="colored"
        />
        <ChatbotSimple accessToken={accessToken} />
      </Router>
    </>
  );
};

export default App;
