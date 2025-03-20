import { useEffect, useRef, useState } from 'react';
import { Model } from 'vosk-browser';

interface UseVoskSpeechRecognitionResult {
  startListening: () => Promise<void>;
  stopListening: () => void;
  transcript: string;
  isListening: boolean;
  error: string | null;
}

const useVoskSpeechRecognition = (lang: string = "ja-JP"): UseVoskSpeechRecognitionResult => {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognizerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      console.log("Loading Vosk model...");
      try {
        const model = new Model('/model'); // モデルファイルのパスを確認してください
        // 型エラー回避のためオプションは {} を any キャストしています
        const recognizer = await (model as any).registerRecognizer({});
        recognizerRef.current = recognizer;
        console.log("Vosk model loaded and recognizer initialized.");
      } catch (err) {
        console.error("Error loading Vosk model:", err);
        setError("音声認識モデルの読み込みに失敗しました。");
      }
    };
    loadModel();
  }, []);

  const startListening = async () => {
    console.log("startListening triggered");
    if (!recognizerRef.current) {
      setError("認識エンジンが初期化されていません。");
      console.error("Recognizer not initialized");
      return;
    }
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      console.log("AudioContext created with sample rate:", audioContext.sampleRate);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Media stream obtained");
      mediaStreamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      console.log("Media stream source created");

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        console.log("Audio process event, input data length:", inputData.length);
        if (recognizerRef.current) {
          const accepted = recognizerRef.current.acceptWaveform(inputData);
          console.log("Waveform accepted:", accepted);
          const result = recognizerRef.current.result();
          if (result && result.text) {
            console.log("Intermediate result:", result.text);
            setTranscript(result.text);
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsListening(true);
      console.log("録音開始");
    } catch (err: any) {
      console.error("Error in startListening:", err);
      setError(err.message || "音声入力の開始に失敗しました。");
    }
  };

  const stopListening = () => {
    console.log("stopListening triggered");
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      console.log("Media tracks stopped");
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      console.log("Processor disconnected");
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      console.log("Source disconnected");
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      console.log("AudioContext closed");
    }
    setIsListening(false);
    if (recognizerRef.current) {
      const finalResult = recognizerRef.current.finalResult();
      console.log("Final result from recognizer:", finalResult);
      setTranscript(finalResult.text);
    }
  };

  return { startListening, stopListening, transcript, isListening, error };
};

export default useVoskSpeechRecognition;
