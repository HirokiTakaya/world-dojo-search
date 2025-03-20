// src/components/ModalDojoDetail.tsx

import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { Dojo } from "../types";
import axiosInstance from "../utils/axiosInstance";
import { isAxiosError } from "../utils/isAxiosError";
import { FaGlobe, FaInstagram } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTranslation } from 'react-i18next';

Modal.setAppElement("#root");

type ModalDojoDetailProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  dojo: Dojo | null;
};

const ModalDojoDetail: React.FC<ModalDojoDetailProps> = ({
  isOpen,
  onRequestClose,
  dojo,
}) => {
  const { t } = useTranslation();
  // dojo オブジェクトをローカルステートでコピーし、後で detail を上書き
  const [detailDojo, setDetailDojo] = useState<Dojo | null>(dojo);

  const userToken = localStorage.getItem("accessToken") || "";

  // Instagram は detailDojo に含める形でもOKだが、分離して管理するなら下記でも良い。
  const [instagram, setInstagram] = useState<string | null>(null);

  // 1) モーダルを開くたびに道場情報をマージ
  useEffect(() => {
    if (dojo) {
      setDetailDojo(dojo);
      setInstagram(dojo.instagram || null);
    } else {
      setDetailDojo(null);
      setInstagram(null);
    }
  }, [dojo]);

  // 2) Googleレビューが無ければ、追加で fetch_place_details を呼び出す
  useEffect(() => {
    const fetchAdditionalDetails = async (placeId: string) => {
      try {
        const res = await axiosInstance.get<Dojo>(
          `/fetch_place_details/?place_id=${placeId}`
        );
        if (res.data) {
          // レスポンスデータ (reviewsなど) を detailDojo にマージ
          setDetailDojo((prev) => {
            if (!prev) return res.data; 
            return {
              ...prev,
              ...res.data, // レビューや rating, hours 等を上書き
            };
          });
          // Instagram がなければここでセット
          if (!instagram && res.data.instagram) {
            setInstagram(res.data.instagram);
          }
        }
      } catch (err) {
        console.error(t('errorFetchingFavorites'), err);
      }
    };

    if (detailDojo && detailDojo.place_id) {
      // まだ reviews を持っていない場合だけ fetch
      if (!detailDojo.reviews || detailDojo.reviews.length === 0) {
        fetchAdditionalDetails(detailDojo.place_id);
      }
    }
  }, [detailDojo, instagram, t]);

  // 3) Instagram も無い＆ Website があれば fetch_instagram_link する
  useEffect(() => {
    const fetchInstagramLink = async (website: string, name: string) => {
      try {
        const res = await axiosInstance.post<{ instagram: string | null }>(
          "/fetch_instagram_link/",
          { website, name }
        );
        if (res.data.instagram) {
          setInstagram(res.data.instagram);
        }
      } catch (err) {
        console.error(t('errorFetchingFavorites'), err);
      }
    };

    if (detailDojo && !instagram && detailDojo.website) {
      fetchInstagramLink(detailDojo.website, detailDojo.name);
    }
  }, [detailDojo, instagram, t]);

  if (!detailDojo) return null;

  const handleAddFavorite = async () => {
    if (!detailDojo) return;
    if (!userToken) {
      toast.error(t('login'));
      return;
    }
    try {
      await axiosInstance.post("/favorites/", { place_id: detailDojo.place_id });
      toast.success(t('favoriteAdded'));
      window.dispatchEvent(new Event("favoriteAdded"));
    } catch (error) {
      console.error(t('failedToFetchFavorites'), error);
      if (isAxiosError(error)) {
        if (error.response) {
          toast.error(`${t('failedToFetchFavorites')} ${error.response.status} ${error.response.statusText}`);
        } else if (error.request) {
          toast.error(t('serverErrorWhileFetchingFavorites'));
        } else {
          toast.error(t('unexpectedErrorWhileFetchingFavorites'));
        }
      } else {
        toast.error(t('unexpectedErrorWhileFetchingFavorites'));
      }
    }
  };

  const renderStars = (rating: number) => {
    const rounded = Math.round(rating);
    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
  };

  const renderReviews = () => {
    if (!detailDojo.reviews || detailDojo.reviews.length === 0) {
      return (
        <p className="text-sm text-gray-600">
          {t('noGoogleReviews')}
        </p>
      );
    }
    return (
      <div className="max-h-32 overflow-y-auto bg-gray-100 p-3 rounded border border-gray-300 mb-3">
        {detailDojo.reviews.slice(0, 5).map((rev, idx) => (
          <div key={idx} className="mb-3">
            <p className="font-bold text-sm text-gray-800">
              {rev.author_name} - {rev.rating}★
            </p>
            <p className="text-sm whitespace-pre-wrap text-gray-700">
              {rev.text}
            </p>
            <hr className="my-2 border-gray-300" />
          </div>
        ))}
      </div>
    );
  };

  return (
 // Modalの設定部分のみ修正
<Modal
  isOpen={isOpen}
  onRequestClose={() => {
    onRequestClose();
    window.scrollTo(0, 0); // トップへ戻す
  }}
  shouldCloseOnOverlayClick={true}
  overlayClassName="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
  className="bg-white text-black p-6 rounded shadow-lg w-80 max-h-[80vh] overflow-y-auto relative"
  bodyOpenClassName={null}  // 重要な修正
  htmlOpenClassName={null}  // 重要な修正
  contentLabel={t('details')}
>

      
      
     
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        {detailDojo.name}
      </h2>

      {detailDojo.rating ? (
        <p className="mb-3 text-gray-700">
          <strong>{t('rating')}:</strong>{" "}
          {detailDojo.rating.toFixed(1)} / 5.0{" "}
          <span className="text-yellow-400 font-bold ml-1">
            {renderStars(detailDojo.rating)}
          </span>
          {detailDojo.user_ratings_total && (
            <span className="ml-1 text-sm text-gray-500">
              ({detailDojo.user_ratings_total} {t('reviews')})
            </span>
          )}
        </p>
      ) : (
        <p className="text-sm text-gray-600 mb-3">
          {t('noGoogleRating')}
        </p>
      )}

      <h4 className="text-lg font-semibold mb-2 text-gray-800">
        {t('reviews')}:
      </h4>
      {renderReviews()}

      <p className="text-sm mb-3 text-gray-700">
        <strong>{t('address')}:</strong> {detailDojo.address}
      </p>

      <p className="text-sm mb-3 text-gray-700 flex items-center gap-1">
        <strong>{t('website')}:</strong>{" "}
        {detailDojo.website ? (
          <a
            href={detailDojo.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <FaGlobe className="text-blue-600 hover:text-blue-800 w-5 h-5" />
          </a>
        ) : (
          "N/A"
        )}
      </p>

      <p className="text-sm mb-3 text-gray-700 flex items-center gap-1">
        <strong>{t('instagram')}:</strong>{" "}
        {instagram ? (
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <FaInstagram className="text-pink-600 hover:text-pink-800 w-5 h-5" />
          </a>
        ) : (
          "N/A"
        )}
      </p>

      <h4 className="text-lg font-semibold mb-2 text-gray-800">
        {t('businessHours')}:
      </h4>
      {detailDojo.hours && detailDojo.hours.length > 0 ? (
        <ul className="list-disc list-inside text-sm mb-3 text-gray-700">
          {detailDojo.hours.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600 mb-3">
          {t('noGoogleRating')}
        </p>
      )}

      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={handleAddFavorite}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          {t('addToFavorites')}
        </button>
        <button
          onClick={onRequestClose}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
        >
          {t('close')}
        </button>
      </div>
    </Modal>
  );
};

export default ModalDojoDetail;
