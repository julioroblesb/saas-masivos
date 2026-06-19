import { useState } from 'react';

export function useCampaignAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const start = () => {
    setIsRecording(true);
    setSeconds(0);
  };

  const stop = async (): Promise<File | null> => {
    setIsRecording(false);
    return new File(["mock audio content"], "audio.mp3", { type: "audio/mp3" });
  };

  const cancel = () => {
    setIsRecording(false);
    setSeconds(0);
  };

  return { start, stop, cancel, isRecording, seconds };
}
