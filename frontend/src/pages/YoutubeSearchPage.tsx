// src/pages/YoutubeSearchPage.tsx
import React, { useState, useRef, useEffect } from "react";
import "./YoutubeSearchPage.css";   // ← 追加
import KeywordSelector from "../components/KeywordSelector";
import { fetchYoutubeVideos } from "../services/fetchYoutubeVideos";
import { useTranslation } from "react-i18next";

interface VideoItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: { url: string };
    };
  };
}

const YoutubeSearchPage: React.FC = () => {
  const { t } = useTranslation();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string>("");

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleKeywordSelect = async (k: string) => {
    try {
      setError("");
      setLoading(true);
      setKeyword(k);
      setVideos([]);
      setNextPageToken("");
      const { items, nextPageToken } = await fetchYoutubeVideos(k);
      setVideos(items);
      setNextPageToken(nextPageToken);
    } catch (err) {
      console.error(err);
      setError(t("errorOccurredMessage"));
    } finally {
      setLoading(false);
    }
  };

  const loadMoreVideos = async () => {
    if (!keyword || !nextPageToken || loading) return;
    try {
      setLoading(true);
      setError("");
      const { items, nextPageToken: newToken } = await fetchYoutubeVideos(
        keyword,
        nextPageToken
      );
      setVideos((prev) => [...prev, ...items]);
      setNextPageToken(newToken);
    } catch (err) {
      console.error(err);
      setError(t("errorOccurredMessage"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        loadMoreVideos();
      }
    });
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [sentinelRef, keyword, nextPageToken, loading]);

  return (
    // classNameに「youtube-search」を適用
    <div className="youtube-search">
      <h2 className="text-xl font-bold my-4">{t("videoSearchTitle")}</h2>

      <KeywordSelector onSelect={handleKeywordSelect} />

      {loading && <p>{t("loadingMessage")}</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div key={video.id.videoId} className="mb-4">
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${video.id.videoId}`}
              title={video.snippet.title}
              allowFullScreen
            />
            <p className="mt-2">{video.snippet.title}</p>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-10 mt-4" />
    </div>
  );
};

export default YoutubeSearchPage;
