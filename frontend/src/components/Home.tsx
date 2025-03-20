// src/components/Home.tsx

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Map from "./Map";
import LoadingAnimation from "./LoadingAnimation";
import ModalDojoDetail from "./ModalDojoDetail";
import { Dojo, Favorite } from "../types";
import styles from "../App.module.css";

type HomeProps = {
  dojos: Dojo[];
  center: { lat: number; lng: number };
  loading: boolean;
  error: string | null;
  // 以下は残してもいいが、本コンポーネントでは使わなくなった場合は不要
  region: string;
  setRegion: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: () => Promise<void>;
  startListening: () => void;
  isListening: boolean;
  speechError: string | null;
  accessToken: string | null;
  favorites: Favorite[];
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
  favorites,
}) => {
  const { t } = useTranslation();

  // 道場詳細モーダル
  const [selectedDojo, setSelectedDojo] = useState<Dojo | null>(null);
  const handleMarkerClick = (dojo: Dojo) => setSelectedDojo(dojo);
  const handleCloseModal = () => setSelectedDojo(null);

  return (
    <>
   

      <div className="relative z-10 flex flex-col items-center w-full p-4">
        {/* エラー表示 */}
        {(speechError || error) && (
          <div className="mb-4 text-red-500">
            {speechError || error}
          </div>
        )}

        {/* ローディング中 */}
        {loading && <LoadingAnimation />}

        {/* マップ */}
        <div className={`${styles.mapContainer} relative z-10`}>
          <Map
            lat={center.lat}
            lng={center.lng}
            dojos={dojos}
            favorites={favorites}
            onMarkerClick={handleMarkerClick}
          />
        </div>

        {/* 選択した道場の詳細モーダル */}
        <ModalDojoDetail
          isOpen={!!selectedDojo}
          onRequestClose={handleCloseModal}
          dojo={selectedDojo}
        />
      </div>
    </>
  );
};

export default Home;
