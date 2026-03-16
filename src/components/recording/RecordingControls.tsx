
import React, { useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import VideoStatus from './VideoStatus';

const SUPABASE_URL = "https://lpygwakpksolprthcrqy.supabase.co";
const PROXY_BASE = `${SUPABASE_URL}/functions/v1/ip-camera-proxy`;

interface RecordingControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  imgRef?: React.RefObject<HTMLImageElement>;
  isRecording: boolean;
  loading: boolean;
  selectedCamera: string;
  cameraPermission: boolean | null;
  cameraError: string | null;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  chunksRef: React.MutableRefObject<Blob[]>;
  startGpsTracking: () => boolean;
  startTimer: () => void;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  stopGpsTracking: () => void;
  stopTimer: () => void;
  uploadRecording: (
    chunks: Blob[],
    setLoading: (v: boolean) => void,
    setIsRecording: (v: boolean) => void,
    setRecordingTime: (v: number) => void,
    recordingDuration: number
  ) => Promise<void>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setRecordingTime: React.Dispatch<React.SetStateAction<number>>;
  getRecordingDuration: () => number;
  isIpCamera?: boolean;
  ipStreamUrl?: string;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  videoRef,
  imgRef,
  isRecording,
  loading,
  selectedCamera,
  cameraPermission,
  cameraError,
  mediaRecorderRef,
  chunksRef,
  startGpsTracking,
  startTimer,
  setIsRecording,
  stopGpsTracking,
  stopTimer,
  uploadRecording,
  setLoading,
  setRecordingTime,
  getRecordingDuration,
  isIpCamera = false,
  ipStreamUrl = '',
}) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const stopPollingLoop = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Poll the proxy for JPEG snapshots and paint onto canvas for recording
  const getIpCameraStream = useCallback((): MediaStream | null => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // If we have an img element showing the MJPEG stream, paint it to canvas
    const imgEl = imgRef?.current;
    if (imgEl) {
      // Use the live <img> element which shows the MJPEG stream
      const paintFrame = () => {
        if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
          canvas.width = imgEl.naturalWidth;
          canvas.height = imgEl.naturalHeight;
          ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        }
      };

      // Poll and paint frames from the proxy (CORS-safe) for recording
      const proxyUrl = `${PROXY_BASE}?url=${encodeURIComponent(ipStreamUrl)}`;
      
      const fetchAndPaint = async () => {
        try {
          const res = await fetch(proxyUrl);
          if (!res.ok) return;
          const blob = await res.blob();
          const bitmap = await createImageBitmap(blob);
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
        } catch (e) {
          // If proxy fetch fails, try painting from img element directly
          paintFrame();
        }
      };

      // Fetch first frame immediately
      fetchAndPaint();
      // Then poll at ~10fps (100ms interval) — balance between quality and load
      pollIntervalRef.current = window.setInterval(fetchAndPaint, 100);
    }

    return canvas.captureStream(10);
  }, [imgRef, ipStreamUrl]);

  const handleStartRecording = async () => {
    if (isIpCamera) {
      if (!ipStreamUrl) {
        toast({
          title: 'Error',
          description: 'IP Camera stream not ready. Enter a valid stream URL.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!videoRef.current?.srcObject) {
        toast({
          title: 'Error',
          description: 'Camera not initialized',
          variant: 'destructive',
        });
        return;
      }
    }

    const gpsStarted = startGpsTracking();
    if (!gpsStarted) {
      console.warn('GPS tracking could not be started, continuing without GPS');
      toast({
        title: 'GPS Warning',
        description: 'GPS tracking could not be started. Location data may be limited.',
        variant: 'default',
      });
    }

    try {
      let stream: MediaStream;

      if (isIpCamera) {
        const canvasStream = getIpCameraStream();
        if (!canvasStream) {
          throw new Error('Failed to capture IP camera stream');
        }
        stream = canvasStream;
      } else {
        stream = videoRef.current!.srcObject as MediaStream;
      }

      const options = { 
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 500000
      };
      
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        console.log(`Using ${options.mimeType} for recording with ${options.videoBitsPerSecond}bps`);
      } else {
        console.log(`${options.mimeType} not supported, using browser default`);
        mediaRecorderRef.current = new MediaRecorder(stream);
      }

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log(`Received data chunk: ${event.data.size} bytes`);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log(`Recording stopped with ${chunksRef.current.length} chunks collected`);
        stopPollingLoop();
        const finalDuration = getRecordingDuration();
        console.log(`Final recording duration: ${finalDuration} seconds`);
        
        await uploadRecording(
          chunksRef.current,
          setLoading,
          setIsRecording,
          setRecordingTime,
          finalDuration
        );
        chunksRef.current = [];
      };

      console.log('Starting MediaRecorder');
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      startTimer();

      toast({
        title: 'Recording started',
        description: gpsStarted ? 'GPS tracking is active. Recording in progress.' : 'Recording in progress without GPS.',
      });
    } catch (err) {
      console.error('Error starting recording:', err);
      stopPollingLoop();
      toast({
        title: 'Recording Error',
        description: 'Failed to start recording',
        variant: 'destructive',
      });
      stopGpsTracking();
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording');
      mediaRecorderRef.current.stop();
      stopTimer();
    }
  };

  return (
    <VideoStatus
      isRecording={isRecording}
      loading={loading}
      selectedCamera={selectedCamera}
      cameraPermission={isIpCamera ? true : cameraPermission}
      error={cameraError}
      startRecording={handleStartRecording}
      stopRecording={handleStopRecording}
    />
  );
};

export default RecordingControls;
