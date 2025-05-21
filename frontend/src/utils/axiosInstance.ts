// src/utils/axiosInstance.ts
import axios from 'axios';

/**
 * Axios v2 以降では "AxiosRequestConfig", "AxiosError", "AxiosResponse" など
 * 直接インポートできないことがあるため、
 * 必要なら自分で独自型を定義して使います。
 */

// (例) 独自リクエスト設定の型
interface CustomAxiosRequestConfig {
  url?: string;
  method?: string;
  baseURL?: string;
  headers?: Record<string, any>;
  data?: any;
  params?: any;
  // リトライ制御用
  _retry?: boolean;
  [key: string]: any;
}

// Axiosインスタンス生成
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
});

// リクエスト インターセプター
api.interceptors.request.use(
  (config) => {
    // アクセストークンをセット
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンス インターセプター
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // error.config を独自型に変換
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // 401 & _retryなし ならリフレッシュ
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        // 例: サーバーが { "access": string } を返す
        const resp = await axios.post<{ access: string }>(
          '/api/refresh_token/',
          { refresh: refreshToken }
        );
        const newAccessToken = resp.data.access;

        localStorage.setItem('accessToken', newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }
        // 再試行時に型エラーが出る場合は as any などでキャスト
        return api(originalRequest as any);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // リフレッシュ失敗時はログアウトなど
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
