// src/services/fetchYoutubeVideos.ts
export async function fetchYoutubeVideos(keyword: string, pageToken = "") {
  const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY; 
  console.log("API_KEY:", API_KEY); // これを追加
  const BASE_URL = "https://www.googleapis.com/youtube/v3/search";

  const q = `柔術 ${keyword}`;

  const params = new URLSearchParams({
    part: "snippet",
    q: q,
    type: "video",
    maxResults: "10",
    key: API_KEY ?? "",
  });

  // pageToken があれば付与
  if (pageToken) {
    params.append("pageToken", pageToken);
  }

  const response = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error("YouTube API error");
  }

  const data = await response.json();

  // nextPageToken があれば返す
  return {
    items: data.items || [],
    nextPageToken: data.nextPageToken || "",
  };
}
