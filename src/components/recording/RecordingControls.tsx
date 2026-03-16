
import React, { useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import VideoStatus from './VideoStatus';

interface RecordingControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
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
  const drawLoopRef = useRef<number | null>(null);

  const stopCanvasLoop = useCallback(() => {
    if (drawLoopRef.current) {
      cancelAnimationFrame(drawLoopRef.current);
      drawLoopRef.current = null;
    }
  }, []);

  const getIpCameraStream = useCallback((): MediaStream | null => {
    if (!videoRef.current) return null;

    // Create a hidden canvas to capture the video element
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw loop to paint video frames onto canvas
    const draw = () => {
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      drawLoopRef.current = requestAnimationFrame(draw);
    };
    draw();

    // captureStream from canvas gives us a recordable MediaStream
    return canvas.captureStream(30);
  }, [videoRef]);

  const handleStartRecording = async () => {
    if (isIpCamera) {
      // IP Camera recording path
      if (!videoRef.current || !ipStreamUrl) {
        toast({
          title: 'Error',
          description: 'IP Camera stream not ready. Enter a valid stream URL.',
          variant: 'destructive',
        });
        return;
      }

      // Wait for video to be playable
      if (videoRef.current.readyState < 2) {
        toast({
          title: 'Error',
          description: 'Stream is still loading. Please wait for the preview to appear.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      // Device camera recording path (existing logic)
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
        stopCanvasLoop();
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
      stopCanvasLoop();
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
