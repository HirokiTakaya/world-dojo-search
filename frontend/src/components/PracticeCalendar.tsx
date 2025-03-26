// src/components/PracticeCalendar.tsx

import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css"; 
import "../index.css"; 
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";
import { FaCheckCircle } from "react-icons/fa";
import { formatDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

type PracticeDay = {
  id: number;
  date: string; 
};

interface PracticeCalendarProps {
  accessToken?: string | null;
}

/*
  【変更点】
  - 画面幅640px未満のときに max-width を smaller に (18rem など)
  - 画面幅640px以上から大きめ (md: ~) に切り替え
  - さらにパディングを削減 (p-2, sm:p-4 など)
*/
const CalendarContainer = styled.div`
  /* 通常CSSで上マージン */

  @media (min-width: 640px) {
  margin-top: 5rem;
    margin-left: 3rem;
  }

  /* Tailwindの@applyでコンテナサイズと見た目調整 */
  @apply 
    flex 
    flex-col 
    items-center 
    p-2             /* モバイルでのパディングを小さめに */
    sm:p-4          /* 640px以上で少し大きめにする */
    md:p-6          /* 768px以上でさらに */
    bg-gray-100 
    rounded-lg 
    shadow-md 
    w-full 
    mx-auto;

  /* 画面幅に応じて max-width を段階的に変更 
     (Tailwindのユーティリティではなく通常のCSSメディアクエリで指定例) */

  /* モバイル (639px) */
  margin-top:9.8rem;
  margin-left:1.5rem;
  max-width: 20rem; /* 18rem = 288px程度 */
 max-height: 18rem; 

  /* タブレット (640px以上) */
  @media (min-width: 640px) {
    max-width: 24rem; /* 24rem = 384px */
  }

  /* デスクトップ (768px以上) */
  @media (min-width: 768px) {
    max-width: 32rem; /* 32rem = 512px */
  }

  /* さらに大きい (1024px以上) */
  @media (min-width: 1024px) {
    max-width: 36rem; /* 36rem = 576px */
  }
`;

const Title = styled.h2`
  @apply text-xl sm:text-2xl md:text-3xl font-semibold mb-4 text-gray-800;
  /* ↑ 画面幅が小さい時は文字を小さく、大きいとき大きく */
`;

const PracticeCalendar: React.FC<PracticeCalendarProps> = ({ accessToken }) => {
  const { t } = useTranslation();
  const [practiceDates, setPracticeDates] = useState<PracticeDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setError(t("failedToFetchPracticeDays", "Login required."));
      return;
    }

    const fetchPracticeDays = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get<PracticeDay[]>("/practice_days/", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setPracticeDates(response.data);
      } catch (err: any) {
        console.error("Error fetching practice days:", err);
        setError(
          t("failedToFetchPracticeDays", "Failed to fetch practice days.")
        );
        toast.error(
          t("failedToFetchPracticeDays", "Failed to fetch practice days.")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPracticeDays();
  }, [t, accessToken]);

  const handleDayClick = async (date: Date) => {
    if (!accessToken) {
      toast.error("Login required.");
      return;
    }
    await togglePracticeDay(date);
  };

  const togglePracticeDay = async (date: Date) => {
    const dateString = formatDate(date);
    const existingPractice = practiceDates.find(pd => pd.date === dateString);

    if (existingPractice) {
      try {
        await axiosInstance.delete(`/practice_days/${existingPractice.id}/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setPracticeDates(practiceDates.filter(pd => pd.id !== existingPractice.id));
        toast.success(t("practiceDayDeleted", "Practice day deleted."));
      } catch (err: any) {
        console.error("Error deleting practice day:", err);
        toast.error("Failed to delete practice day.");
      }
    } else {
      try {
        const response = await axiosInstance.post<PracticeDay>(
          "/practice_days/",
          { date: dateString },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        setPracticeDates([...practiceDates, response.data]);
        toast.success(t("practiceDayAdded", "Practice day added."));
      } catch (err: any) {
        console.error("Error adding practice day:", err);
        toast.error("Failed to add practice day.");
      }
    }
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === "month") {
      const dateString = formatDate(date);
      const isPracticeDay = practiceDates.some(pd => pd.date === dateString);
      if (isPracticeDay) return "practice-day";
    }
    return "";
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === "month") {
      const dateString = formatDate(date);
      const isPracticeDay = practiceDates.some(pd => pd.date === dateString);
      return isPracticeDay ? (
        <div className="absolute top-1 right-1">
          <FaCheckCircle className="text-green-500" />
        </div>
      ) : null;
    }
    return null;
  };

  return (
    <CalendarContainer>
      <Title>{t("practiceCalendar", "Practice Calendar")}</Title>

      {loading && (
        <div className="mb-4 flex flex-col items-center">
          <svg
            className="animate-spin h-6 w-6 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-gray-500 mt-2 text-sm">{t("loading", "Loading...")}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-200 text-red-800 rounded shadow w-full text-sm">
          {error}
        </div>
      )}

      <Calendar
        onClickDay={handleDayClick}
        tileClassName={tileClassName}
        tileContent={tileContent}
        className="w-full border border-gray-300 rounded-lg p-2 md:p-3 relative text-gray-800 mx-auto"
      />

      <div className="mt-4 text-center">
        <p className="text-gray-600 text-xs sm:text-sm">
          {t("togglePracticeDay", "日付をクリックして練習した日をマークできます。")}
        </p>
      </div>
    </CalendarContainer>
  );
};

export default PracticeCalendar;
