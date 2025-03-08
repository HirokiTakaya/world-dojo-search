import React from "react";
import axiosInstance from "../utils/axiosInstance";
import { Dojo } from "../types";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

type DojoCardProps = {
  dojo: Dojo;
  isFavorited: boolean;
  onFavoriteSuccess: () => void;
};

const DojoCard: React.FC<DojoCardProps> = ({ dojo, isFavorited, onFavoriteSuccess }) => {
  const { t } = useTranslation();

  const handleFavorite = async () => {
    try {
      if (isFavorited) {
        // お気に入り解除 (DELETE)
        await axiosInstance.delete(`/api/favorites/${dojo.place_id}/`);
        toast.success(t("favoriteRemoved")); // 成功時のトースト
      } else {
        // お気に入り登録 (POST)
        await axiosInstance.post("/api/favorites/", { place_id: dojo.place_id });
        toast.success(t("favoriteAdded")); // 成功時のトースト
      }
      // 成功後の状態更新
      onFavoriteSuccess();
    } catch (error: any) {
      console.error(t("favoriteActionFailed"), error);
      if (error.response) {
        // サーバーエラーの場合
        const { status, statusText } = error.response;
        toast.error(`${t("errorOccurred")}: ${status} ${statusText}`);
      } else if (error.request) {
        // リクエストエラーの場合
        toast.error(t("serverErrorWhileFetchingFavorites"));
      } else {
        // その他のエラー
        toast.error(t("unexpectedError"));
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* 道場名 */}
      <h3 className="text-lg font-bold mb-2">{dojo.name}</h3>

      {/* 住所 */}
      <p className="text-sm text-gray-600 mb-2">{dojo.address}</p>

      {/* お気に入りボタン */}
      <button
        onClick={handleFavorite}
        className={`mt-2 px-4 py-2 rounded text-white ${
          isFavorited ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
        } transition`}
      >
        {isFavorited ? t("removeFromFavorites") : t("addToFavorites")}
      </button>
    </div>
  );
};

export default DojoCard;
