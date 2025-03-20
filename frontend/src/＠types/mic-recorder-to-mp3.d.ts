declare module 'mic-recorder-to-mp3' {
    export interface RecorderConfig {
      bitRate?: number;
      sampleRate?: number;
    }
  
    export default class MicRecorder {
      constructor(config?: RecorderConfig);
      start(): Promise<void>;
      stop(): Promise<[Uint8Array, Blob]>;
      pause(): void;
      resume(): void;
    }
  }
  