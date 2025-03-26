// useSpeechRecognition.ts
import { useEffect, useState, useRef } from 'react';

// 型定義（簡易的なもの）
// onstart イベントハンドラを追加
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): ISpeechRecognition };
    webkitSpeechRecognition: { new (): ISpeechRecognition };
  }
}

export interface UseSpeechRecognitionResult {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  error: string | null;
  isSupported: boolean;
}

const useSpeechRecognition = (
  onResult: (text: string) => void,
  lang: "en-US" | "ja-JP" = "ja-JP"
): UseSpeechRecognitionResult => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  // Web Speech API 用のインスタンスを保持
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    // ① HTTPS または localhost でない場合はエラーを表示して中断
    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      setError("音声認識にはHTTPS接続が必要です。（localhost は例外）");
      setIsSupported(false);
      return;
    }

    // ブラウザが SpeechRecognition をサポートしているか確認
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("このブラウザは音声認識に対応していません。");
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // イベントハンドラの設定
    recognition.onstart = () => {
      console.log("音声認識開始");
      setIsListening(true);
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log("認識結果:", transcript);
      onResult(transcript);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("音声認識エラー:", event.error);
      setError("音声認識エラー: " + event.error);
    };
    recognition.onend = () => {
      console.log("音声認識終了");
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [lang, onResult]);

  // 音声認識開始
  const startListening = () => {
    // エラーをリセット
    setError(null);
    // isSupported が true かつ現在リスニングしていない場合のみ開始
    if (recognitionRef.current && !isListening && isSupported) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
        setError("音声認識の開始に失敗しました。");
      }
    }
  };

  // 音声認識停止
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
        setError("音声認識の停止に失敗しました。");
      }
    }
  };

  return { startListening, stopListening, isListening, error, isSupported };
};

export default useSpeechRecognition;
