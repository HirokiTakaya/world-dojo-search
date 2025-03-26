// src/components/FavoritesList.tsx
import React, { useEffect, useState, useCallback } from "react";
import { isAxiosError } from "../utils/isAxiosError";
import api from "../utils/axiosInstance";
import ModalDojoDetail from "./ModalDojoDetail";
import LoadingAnimation from "./LoadingAnimation";
import { Dojo, Favorite } from "../types";
import Modal from "react-modal";
import { FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

/* 
  PracticeCalendar と同様に、コンテナを styled-components で定義し、
  - レスポンシブな max-width
  - 上下余白 (margin-top)
  - Tailwind のユーティリティ @apply
*/
const FavoritesContainer = styled.div`
  /* 1) Tailwindユーティリティでデザイン（背景・角丸等） */
  @apply
    bg-white/80
    backdrop-blur-sm
    rounded-lg
    shadow-md
    flex
    flex-col
    px-4
    py-6
    sm:p-6
    w-full
    mx-auto;

  /* 2) レスポンシブ幅 (max-width) を段階的に定義 */
  @apply max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl;

  /* 3) 上下の余白を画面幅に応じて増やす */
  margin-top: 11rem; /* モバイル: 64px */
  @media (min-width: 640px) {
    margin-top: 6rem; /* 640px以上: 96px */
  }
  @media (min-width: 768px) {
    margin-top: 8rem; /* 768px以上: 128px */
  }
  @media (min-width: 1024px) {
    margin-top: 10rem; /* 1024px以上: 160px */
  }
`;

const Title = styled.h2`
  @apply text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4 text-gray-800;
`;

const ModalContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(6px);
  border-radius: 1rem;
  padding: 1.5rem;
`;

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetName?: string;
};

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetName,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel={t("deleteConfirmation")}
      overlayClassName={{
        base: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 opacity-0 transition-opacity duration-300",
        afterOpen: "opacity-100",
        beforeClose: "opacity-0",
      }}
      className={{
        base: "bg-white text-black p-6 rounded-lg w-80 max-h-[80vh] overflow-y-auto transform scale-90 transition-transform duration-300 opacity-0",
        afterOpen: "opacity-100 scale-100",
        beforeClose: "opacity-0 scale-75",
      }}
    >
      <div className="flex flex-col items-center text-center">
        <FaExclamationTriangle className="text-red-500 w-12 h-12 mb-3" />
        <h2 className="text-xl font-bold mb-2">{t("deleteConfirmation")}</h2>
        <p className="text-gray-700 mb-4">
          {targetName
            ? t("deleteConfirmationMessage", { name: targetName })
            : t("deleteConfirmationMessage", { name: "" })}
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition"
          >
            {t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            {t("delete")}
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface FavoritesListProps {
  accessToken?: string | null;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ accessToken }) => {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDojo, setSelectedDojo] = useState<Dojo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [targetFavoriteId, setTargetFavoriteId] = useState<number | null>(null);
  const [targetName, setTargetName] = useState<string | null>(null);

  // データ取得ロジック
  const fetchFavorites = React.useCallback(async () => {
    if (!accessToken) {
      setError(t("errorFetchingFavorites", "Login required."));
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const response = await api.get<Favorite[]>("/favorites/", { headers });
      setFavorites(response.data);
    } catch (err: unknown) {
      console.error(t("errorFetchingFavorites"), err);
      const message =
        isAxiosError(err) && err.response?.data?.detail
          ? err.response.data.detail
          : t("errorFetchingFavorites");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    fetchFavorites();
  }, [accessToken, fetchFavorites]);

  useEffect(() => {
    const handleFavoriteAdded = () => {
      fetchFavorites();
    };
    window.addEventListener("favoriteAdded", handleFavoriteAdded);
    return () => {
      window.removeEventListener("favoriteAdded", handleFavoriteAdded);
    };
  }, [fetchFavorites]);

  const openModal = (dojo: Dojo) => {
    setSelectedDojo(dojo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedDojo(null);
    setIsModalOpen(false);
  };

  const openConfirmModal = (favoriteId: number, dojoName: string) => {
    setTargetFavoriteId(favoriteId);
    setTargetName(dojoName);
    setIsConfirmOpen(true);
  };

  const closeConfirmModal = () => {
    setTargetFavoriteId(null);
    setTargetName(null);
    setIsConfirmOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!targetFavoriteId || !accessToken) return;
    try {
      await api.delete(`/favorites/${targetFavoriteId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success(t("favoriteRemoved"));
      fetchFavorites();
    } catch (err: unknown) {
      console.error(t("errorDeletingFavorite"), err);
      const message =
        isAxiosError(err) && err.response?.data?.detail
          ? err.response.data.detail
          : t("errorDeletingFavorite");
      toast.error(message);
    } finally {
      closeConfirmModal();
    }
  };

  return (
    <FavoritesContainer>
      <Title>{t("favoritesList")}</Title>

      {loading ? (
        <LoadingAnimation />
      ) : error ? (
        <p className="text-red-500 font-bold mb-4">{error}</p>
      ) : favorites.length > 0 ? (
        <div className="max-h-96 sm:max-h-[32rem] overflow-y-auto pr-2 mb-4">
          <ul className="space-y-4">
            {favorites.map((fav) => (
              <li
                key={fav.id}
                className="bg-white shadow rounded p-3 hover:bg-gray-50 transition"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-1">
                  {fav.dojo.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-2">
                  {fav.dojo.address}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  {fav.dojo.website ? (
                    <a
                      href={fav.dojo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {t("website")}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">N/A</span>
                  )}
                  {fav.dojo.instagram ? (
                    <a
                      href={fav.dojo.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:underline text-sm"
                    >
                      {t("instagram")}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">N/A</span>
                  )}
                </div>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <button
                    onClick={() => openModal(fav.dojo)}
                    className="
                      bg-blue-500 text-white text-sm px-2 py-1 rounded
                      hover:bg-blue-600 transition
                      w-full sm:w-auto
                    "
                  >
                    {t("details")}
                  </button>
                  <button
                    onClick={() => openConfirmModal(fav.id, fav.dojo.name)}
                    className="
                      bg-red-500 text-white text-sm px-2 py-1 rounded
                      hover:bg-red-600 transition
                      w-full sm:w-auto
                    "
                  >
                    {t("deleteButton")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-6 text-sm">
          {t("noFavorites")}
        </p>
      )}

      {selectedDojo && (
        <ModalDojoDetail
          isOpen={isModalOpen}
          onRequestClose={closeModal}
          dojo={selectedDojo}
        />
      )}

      <ConfirmDeleteModal
        isOpen={isConfirmOpen}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmDelete}
        targetName={targetName || undefined}
      />
    </FavoritesContainer>
  );
};

export default FavoritesList;
