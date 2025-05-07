
import { useRef, useState, useCallback } from 'react';

interface UseVideoRecordingReturn {
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  recordingTime: number;
  setRecordingTime: React.Dispatch<React.SetStateAction<number>>;
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  chunksRef: React.MutableRefObject<Blob[]>;
  startTimer: () => void;
  stopTimer: () => void;
  getRecordingDuration: () => number;
}

export function useVideoRecording(): UseVideoRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
      setRecordingTime(elapsedSeconds);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const getRecordingDuration = useCallback(() => {
    // Calculate the actual duration from recorded data instead of using recordingTime
    // Add 1 to ensure we have at least 1 second
    return Math.max(1, recordingTime);
  }, [recordingTime]);

  return {
    isRecording,
    setIsRecording,
    recordingTime,
    setRecordingTime,
    timerRef,
    mediaRecorderRef,
    chunksRef,
    startTimer,
    stopTimer,
    getRecordingDuration
  };
}
