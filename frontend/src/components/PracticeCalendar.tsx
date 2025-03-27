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

const CalendarContainer = styled.div`

  


  @apply 
    flex 
    flex-col 
    items-center 
    p-2
    sm:p-4
    md:p-6
    bg-gray-100 
    rounded-lg 
    shadow-md 
    w-full 
    mx-auto;

  margin-top:13rem;
 
  max-width: 30rem;
  max-height: 18rem; 

  @media (min-width: 640px) {
    margin-top:13rem;
    margin-left:   auto;  // 明示的にautoを指定し、中央寄せ
   margin-right: auto;
  }

  @media (min-width: 768px) {
    max-width: 32rem;
  }

  @media (min-width: 1024px) {
    max-width: 36rem;
  }
`;

const Title = styled.h2`
  @apply text-xl sm:text-2xl md:text-3xl font-semibold mb-4 text-gray-800;
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
  }, [t, accessToken]); // accessToken が変わるたびに再取得

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
      // すでに登録済みなら削除
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
      // 未登録なら新規作成
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
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
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
