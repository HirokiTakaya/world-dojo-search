// src/App.tsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import ParticlesBackground from "./components/ParticlesBackground";
import LoginScreen from "./LoginComponents/LoginScreen";
import SignUpScreen from "./LoginComponents/SignUpScreen";
import Home from "./components/Home";
import FavoritesList from "./components/FavoritesList";
import useSpeechRecognition, { UseSpeechRecognitionResult } from "./components/useSpeechRecognition";
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

// レスポンス型
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
  
  // --------- 取得データ & ロジック系ステート ---------
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]); // お気に入り（必要に応じて取得する想定）
  
  // 検索キーワード & 検索時の地図中心
  const [region, setRegion] = useState<string>("");
  const [center, setCenter] = useState({ lat: 35.6895, lng: 139.6917 });
  
  // UI状態管理
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // ログイン関連
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // i18n言語→音声認識言語のマッピング
  const mapLanguage = (lng: string): "ja-JP" | "en-US" => {
    return lng.startsWith("ja") ? "ja-JP" : "en-US";
  };
  const [speechLang, setSpeechLang] = useState<"ja-JP" | "en-US">(mapLanguage(i18n.language));

  // 言語切り替え時に音声認識言語も更新
  useEffect(() => {
    setSpeechLang(mapLanguage(i18n.language));
  }, [i18n.language]);

  // モバイルかどうか判定
  const isMobile = useIsMobile();

  // 音声認識フック
  const speechRecognitionData: UseSpeechRecognitionResult = useSpeechRecognition(
    (text: string) => {
      setRegion(text);
      handleSearch();
    },
    speechLang
  );

  // モバイルではダミーにする（音声認識非対応時など）
  const dummySpeechRecognition: UseSpeechRecognitionResult = {
    startListening: () => {},
    stopListening: () => {},
    isListening: false,
    error: "",
    isSupported: false,
  };

  // 有効な音声認識オブジェクトを選択
  const effectiveSpeechRecognition = isMobile ? dummySpeechRecognition : speechRecognitionData;
  const { startListening, isListening, error: speechError } = effectiveSpeechRecognition;

  // 起動時にログイン済みチェック
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsLoggedIn(Boolean(token));
    setAccessToken(token);
  }, []);

  // ---------- 検索処理 ----------
  const handleSearch = async () => {
    if (!region.trim()) {
      setError(t("searchRegionPrompt")); //「地域名を入力してください」など
      return;
    }
    setLoading(true);
    setError(null);
    setDojos([]);
    // 検索前に地図を初期値に戻すかどうかは好み
    setCenter({ lat: 35.6895, lng: 139.6917 });

    try {
      const dojoResponse = await api.get<FetchDojoDataResponse>("/fetch_dojo_data/", {
        params: { query: region },
      });
      const { dojos } = dojoResponse.data;
      if (dojos && dojos.length > 0) {
        setDojos(dojos);
        // 最初のDojoを地図の中心に設定
        const firstDojo = dojos[0];
        if (firstDojo.latitude !== null && firstDojo.longitude !== null) {
          setCenter({ lat: firstDojo.latitude, lng: firstDojo.longitude });
        }
      } else {
        setError(t("noDojosFound")); //「道場が見つかりませんでした」
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

  // ログアウト処理
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
        
        {/* ---------- Stickyヘッダー ---------- */}
        <header className="fixed top-0 left-0 w-full bg-black/80 shadow-md z-50 p-4">
  {/* 上段: ロゴ & リンク */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
    {/* ロゴ & ページ遷移リンク */}
    <div className="flex items-center gap-4">
      <Link to="/">
        <img
          src="/images/jiujitsu-samurai-Logo1.png"
          alt="Home"
          className="h-20 w-auto"
        />
      </Link>
      <Link to="/favorites" className="text-white">
        {t("favorites")}
      </Link>
      <Link to="/practice" className="text-white">
        {t("practiceCalendar")}
      </Link>
    </div>

    {/* ログイン/ログアウト & 言語切り替え */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <LanguageSwitcher />
      {isLoggedIn === null ? (
        <p className="text-white">{t("checkingLoginStatus")}</p>
      ) : !isLoggedIn ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to="/login"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
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

  {/* 下段: 検索フォーム & 音声認識ボタン (ログイン時のみ表示) */}
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
        onClick={handleSearch}
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

        {/* ---------- /Stickyヘッダー ---------- */}

        {/* メインコンテンツ */}
        <div className="flex flex-col h-screen overflow-hidden">
          {/*
            pt-[160px] など、ヘッダー高さより余裕を持って
            コンテンツがヘッダーに隠れないようにする
          */}
          <main className="flex-1 overflow-auto bg-black bg-opacity-50 p-4 pt-[315px] sm:pt-[160px]">
            <Routes>
              <Route
                path="/"
                element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />}
              />
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
                    startListening={startListening}
                    isListening={isListening}
                    speechError={speechError}
                    accessToken={accessToken}
                    favorites={favorites}
                  />
                }
              />
              <Route path="/favorites" element={<FavoritesList accessToken={accessToken} />} />
              <Route path="/practice" element={<PracticeCalendar />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Toastやチャットボットなど全画面共通のコンポーネント */}
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
