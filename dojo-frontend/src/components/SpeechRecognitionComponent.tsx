// src/components/SpeechRecognitionComponent.tsx
import React from "react";
import useSpeechRecognition from "./useSpeechRecognition";

const SpeechRecognitionComponent: React.FC = () => {
  const { startListening, stopListening, isListening, error } = useSpeechRecognition((text: string) => {
    console.log("認識結果:", text);
    // ここで認識結果を必要な処理に反映させる（例：検索フィールドへの反映）
  }, "ja-JP");

  return (
    <div className="speech-recognition-container">
      <button onClick={startListening} disabled={isListening}>
        {isListening ? "録音中..." : "録音開始"}
      </button>
      <button onClick={stopListening} disabled={!isListening}>
        録音停止
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default SpeechRecognitionComponent;
