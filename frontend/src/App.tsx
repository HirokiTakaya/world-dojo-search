// src/App.tsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import ParticlesBackground from "./components/ParticlesBackground";
import LoginScreen from "./LoginComponents/LoginScreen";
import SignUpScreen from "./LoginComponents/SignUpScreen";
import Home from "./components/Home";
import FavoritesList from "./components/FavoritesList";
import useSpeechRecognition, {
  UseSpeechRecognitionResult,
} from "./components/useSpeechRecognition";
import { isAxiosError } from "./utils/isAxiosError";
import { Dojo, Favorite } from "./types";
import api from "./utils/axiosInstance";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaSearch, FaMicrophone } from "react-icons/fa"; // 検索・マイクアイコン
import { useTranslation } from "react-i18next";
import "./i18n";
import LanguageSwitcher from "./components/LanguageSwitcher";
import PracticeCalendar from "./components/PracticeCalendar";
import ChatbotSimple from "./components/ChatbotSimple";

interface FetchDojoDataResponse {
  dojos: Dojo[];
}

// モバイル判定用カスタムフック（省略可）
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

  // ----------- ステート類 -----------
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [region, setRegion] = useState<string>("");
  const [center, setCenter] = useState({ lat: 35.6895, lng: 139.6917 });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ログイン関連ステート
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // 言語切り替えと音声認識のマッピング
  const mapLanguage = (lng: string): "ja-JP" | "en-US" =>
    lng.startsWith("ja") ? "ja-JP" : "en-US";
  const [speechLang, setSpeechLang] = useState<"ja-JP" | "en-US">(
    mapLanguage(i18n.language)
  );

  useEffect(() => {
    setSpeechLang(mapLanguage(i18n.language));
  }, [i18n.language]);

  // モバイル判定
  const isMobile = useIsMobile();

  // -- 起動時に localStorage からトークンを取り出す --
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    setIsLoggedIn(Boolean(storedToken));
    setAccessToken(storedToken);
  }, []);

  // 音声認識用フック
  const speechRecognitionData: UseSpeechRecognitionResult = useSpeechRecognition(
    (text: string) => {
      setRegion(text);
      handleSearch(text);
    },
    speechLang
  );

  // モバイル時は音声認識をオフにしたダミーを返す
  const dummySpeechRecognition: UseSpeechRecognitionResult = {
    startListening: () => {},
    stopListening: () => {},
    isListening: false,
    error: "",
    isSupported: false,
  };
  const effectiveSpeechRecognition = isMobile
    ? dummySpeechRecognition
    : speechRecognitionData;
  const { startListening, isListening, error: speechError } =
    effectiveSpeechRecognition;

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsLoggedIn(false);
    setAccessToken(null);
  };

  // --------------------
  //   ログイン後の検索
  // --------------------
  const handleSearch = async (searchTerm?: string) => {
    const query = searchTerm !== undefined ? searchTerm : region;
    if (!query.trim()) {
      setError(t("searchRegionPrompt")); // 例: "Please enter a region to search."
      return;
    }

    setLoading(true);
    setError(null);
    setDojos([]);
    setCenter({ lat: 35.6895, lng: 139.6917 });

    try {
      const dojoResponse = await api.get<FetchDojoDataResponse>(
        "/fetch_dojo_data/",
        {
          params: { query },
        }
      );
      const { dojos } = dojoResponse.data;
      if (dojos && dojos.length > 0) {
        setDojos(dojos);
        const firstDojo = dojos[0];
        if (firstDojo.latitude !== null && firstDojo.longitude !== null) {
          setCenter({ lat: firstDojo.latitude, lng: firstDojo.longitude });
        }
      } else {
        setError(t("noDojosFound")); // 例: "No dojos found."
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message =
          err.response?.data?.error ?? t("errorFetchingData", "Error fetching data");
        setError(message);
      } else {
        setError(t("unexpectedError", "Unexpected error occurred."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <ParticlesBackground />

      {/* ---------- ヘッダー ---------- */}
      <header className="fixed top-0 left-0 w-full bg-black/80 shadow-md z-50 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* 左側ロゴ・リンク */}
          <div className="flex items-center gap-4">
            <Link to="/">
              <img
                src="/images/jiujitsu-samurai-Logo1.png"
                alt="Home"
                className="h-20 w-auto"
              />
            </Link>
            {/* ログインしているときだけ表示したいリンク */}
            {isLoggedIn && (
              <>
                <Link to="/favorites" className="text-white">
                  {t("favorites")}
                </Link>
                <Link to="/practice" className="text-white">
                  {t("practiceCalendar")}
                </Link>
              </>
            )}
          </div>

          {/* 右側: 言語切り替え & ログイン/ログアウト */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <LanguageSwitcher />
            {isLoggedIn === null ? (
              <p className="text-white">{t("checkingLoginStatus")}</p>
            ) : !isLoggedIn ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  to="/login"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-center"
                >
                  {t("login")}
                </Link>
                <Link
                  to="/signup"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                >
                  {t("signup")}
                </Link>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                {t("logout")}
              </button>
            )}
          </div>
        </div>

        {/* 下段: 検索フォーム (ログインしているときだけ) */}
        {isLoggedIn && (
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 w-full">
            <div className="relative w-full sm:w-auto flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={t("searchForRegion")}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 bg-white text-black"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            >
              {t("search")}
            </button>
            <button
              onClick={startListening}
              disabled={isListening}
              className={`hidden sm:flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto ${
                isListening ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <FaMicrophone className="mr-2" />
              {isListening ? t("listening") : t("voiceInput")}
            </button>
          </div>
        )}
      </header>
      {/* ---------- /ヘッダー ---------- */}

      {/* ---------- ルーティング ---------- */}
      <div className="flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-auto bg-black bg-opacity-50 p-4 pt-[160px]">
          <Routes>
            {/* ルートにアクセスしたら、ログイン済みなら /home、未ログインなら /login へ */}
            <Route
              path="/"
              element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />}
            />
            <Route
              path="/login"
              element={
                <LoginScreen
                  setIsLoggedIn={setIsLoggedIn}
                  setAccessToken={setAccessToken}
                />
              }
            />
            <Route
              path="/signup"
              element={
                <SignUpScreen
                  setIsLoggedIn={setIsLoggedIn}
                  setAccessToken={setAccessToken}
                />
              }
            />
            <Route
              path="/home"
              element={
                !isLoggedIn ? (
                  <Navigate to="/login" replace />
                ) : (
                  <Home
                    dojos={dojos}
                    center={center}
                    loading={loading}
                    error={error}
                    region={region}
                    setRegion={setRegion}
                    handleSearch={handleSearch}
                    startListening={startListening}
                    isListening={isListening}
                    speechError={speechError}
                    accessToken={accessToken}
                    favorites={favorites}
                  />
                )
              }
            />
            <Route
              path="/favorites"
              element={
                !isLoggedIn ? (
                  <Navigate to="/login" replace />
                ) : (
                  <FavoritesList accessToken={accessToken} />
                )
              }
            />
            <Route
              path="/practice"
              element={
                !isLoggedIn ? (
                  <Navigate to="/login" replace />
                ) : (
                  <PracticeCalendar accessToken={accessToken} />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Toast通知 & チャットボットなど */}
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
  );
};

export default App;
