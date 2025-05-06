
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
}

export function useVideoRecording(): UseVideoRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Use useCallback to avoid recreating these functions on each render
  const startTimer = useCallback(() => {
    // Clear any existing timer first to prevent memory leaks
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Reset recording time
    setRecordingTime(0);
    
    // Set up new timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    isRecording,
    setIsRecording,
    recordingTime,
    setRecordingTime,
    timerRef,
    mediaRecorderRef,
    chunksRef,
    startTimer,
    stopTimer
  };
}
