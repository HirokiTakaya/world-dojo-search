// src/components/Home.tsx

import React, { useState, useEffect, useCallback } from "react";
import { isAxiosError } from "../utils/isAxiosError";
import api from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import Map from "./Map";
import LoadingAnimation from "./LoadingAnimation";
import ModalDojoDetail from "./ModalDojoDetail";

import { Dojo, Favorite } from "../types";
import { useTranslation } from "react-i18next";
import { FaSearch, FaMicrophone } from "react-icons/fa";
import { toast } from "react-toastify";

type HomeProps = {
  dojos: Dojo[];
  center: { lat: number; lng: number };
  loading: boolean;
  error: string | null;
  region: string;
  setRegion: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: () => Promise<void>;
  startListening: () => void;
  isListening: boolean;
  speechError: string | null;
  accessToken: string | null;
};

const Home: React.FC<HomeProps> = ({
  dojos,
  center,
  loading,
  error,
  region,
  setRegion,
  handleSearch,
  startListening,
  isListening,
  speechError,
  accessToken,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [selectedDojo, setSelectedDojo] = useState<Dojo | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await api.get<Favorite[]>("/favorites/");
      setFavorites(res.data);
    } catch (err) {
      console.error(t("errorFetchingFavorites"), err);
      if (isAxiosError(err)) {
        if (err.response?.status === 401) {
          toast.error(t("sessionExpired"));
          navigate("/login");
        } else if (err.response?.status === 500) {
          toast.error(t("serverErrorWhileFetchingFavorites"));
        } else {
          toast.error(t("failedToFetchFavoritesPleaseTryAgain"));
        }
      } else {
        toast.error(t("unexpectedErrorWhileFetchingFavorites"));
      }
    }
  }, [navigate, t]);

  useEffect(() => {
    if (accessToken) {
      fetchFavorites();
    }
  }, [accessToken, fetchFavorites]);

  const onSearch = async () => {
    await handleSearch();
  };

  const handleMarkerClick = (dojo: Dojo) => {
    setSelectedDojo(dojo);
  };

  const handleCloseModal = () => {
    setSelectedDojo(null);
  };

  const handleReviewSuccess = () => {
    toast.success(t("reviewPostedSuccessfully"));
    setSelectedDojo(null);
  };

  return (
    <div className="flex flex-col items-center w-full p-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-6 w-full max-w-3xl">
        <div className="relative w-full sm:w-auto flex-1">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t("searchForRegion")}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            aria-label={t("searchForRegion")}
          />
        </div>
        <button
          onClick={onSearch}
          className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
          aria-label={t("search")}
        >
          {t("search")}
        </button>
        {/* 音声入力ボタン：モバイルサイズ(sm 未満)では hidden */}
        <button
          onClick={startListening}
          disabled={isListening}
          className={`hidden sm:flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto ${
            isListening ? "cursor-not-allowed opacity-50" : ""
          }`}
          aria-label={isListening ? t("listening") : t("voiceInput")}
        >
          <FaMicrophone className="mr-2" />
          {isListening ? t("listening") : t("voiceInput")}
        </button>
      </div>

      {/* Error Messages */}
      {(speechError || error) && (
        <div className="mb-4">
          {speechError && <p className="text-red-500 mb-1">{speechError}</p>}
          {error && <p className="text-red-500">{error}</p>}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && <LoadingAnimation />}

      {/* Map Section */}
      <div className="w-full h-[28rem] md:h-[36rem] lg:h-[40rem]">
        <Map
          lat={center.lat}
          lng={center.lng}
          dojos={dojos}
          onMarkerClick={handleMarkerClick}
          favorites={favorites}
        />
      </div>

      {/* Dojo Detail Modal */}
      <ModalDojoDetail
        isOpen={!!selectedDojo}
        onRequestClose={handleCloseModal}
        dojo={selectedDojo}
      />
    </div>
  );
};

export default Home;
