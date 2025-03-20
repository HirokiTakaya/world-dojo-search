// src/components/PracticeCalendar.tsx
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css"; // デフォルトCSS
import "../index.css"; // カスタムCSS
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";
import { FaCheckCircle } from "react-icons/fa";
import { formatDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

type PracticeDay = {
  id: number;
  date: string; // 'YYYY-MM-DD'
};

const CalendarContainer = styled.div`
  @apply flex flex-col items-center p-4 sm:p-6 md:p-8 bg-gray-100 rounded-lg shadow-md w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto mt-8;
`;

const Title = styled.h2`
  @apply text-2xl sm:text-3xl font-semibold mb-6 text-gray-800;
`;

const PracticeCalendar: React.FC = () => {
  const { t } = useTranslation();
  const [practiceDates, setPracticeDates] = useState<PracticeDay[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPracticeDays = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get<PracticeDay[]>("/practice_days/");
        setPracticeDates(response.data);
        console.log("Fetched Practice Dates:", response.data);
      } catch (err: any) {
        console.error("Error fetching practice days:", err);
        setError(t("failedToFetchPracticeDays", "Failed to fetch practice days."));
        toast.error(t("failedToFetchPracticeDays", "Failed to fetch practice days."));
      } finally {
        setLoading(false);
      }
    };

    fetchPracticeDays();
  }, [t]);

  const handleDayClick = async (date: Date) => {
    await togglePracticeDay(date);
  };

  const togglePracticeDay = async (date: Date) => {
    const dateString = formatDate(date);
    const existingPractice = practiceDates.find((pd) => pd.date === dateString);

    if (existingPractice) {
      try {
        await axiosInstance.delete(`/practice_days/${existingPractice.id}/`);
        const updatedPracticeDates = practiceDates.filter((pd) => pd.id !== existingPractice.id);
        setPracticeDates(updatedPracticeDates);
        console.log("Updated Practice Dates after deletion:", updatedPracticeDates);
        toast.success(t("practiceDayDeleted", "Practice day deleted."));
      } catch (err: any) {
        console.error("Error deleting practice day:", err);
        toast.error("Failed to delete practice day.");
      }
    } else {
      try {
        const response = await axiosInstance.post<PracticeDay>("/practice_days/", {
          date: dateString,
        });
        const updatedPracticeDates = [...practiceDates, response.data];
        setPracticeDates(updatedPracticeDates);
        console.log("Updated Practice Dates after addition:", updatedPracticeDates);
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
      const isPracticeDay = practiceDates.some((pd) => pd.date === dateString);
      if (isPracticeDay) {
        return "practice-day";
      }
    }
    return "";
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === "month") {
      const dateString = formatDate(date);
      const isPracticeDay = practiceDates.some((pd) => pd.date === dateString);
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
        <div className="mb-6 flex flex-col items-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <p className="text-gray-500 mt-2">{t("loading", "Loading...")}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-200 text-red-800 rounded shadow w-full">
          {error}
        </div>
      )}

      <Calendar
        onClickDay={handleDayClick}
        tileClassName={tileClassName}
        tileContent={tileContent}
        className="w-full border border-gray-300 rounded-lg p-2 md:p-4 relative text-gray-800 mx-auto"
      />

      <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm sm:text-base">
          {t("togglePracticeDay", "日付をクリックして練習した日をマークできます。")}
        </p>
      </div>
    </CalendarContainer>
  );
};

export default PracticeCalendar;
