
import React from 'react';
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
  startIpRecording?: () => MediaRecorder | null;
  stopIpStream?: () => void;
  drawToCanvas?: () => void;
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
  isIpCamera,
  startIpRecording,
  stopIpStream,
  drawToCanvas
}) => {
  const { toast } = useToast();

  const handleStartRecording = async () => {
    if (isIpCamera) {
      // IP Camera flow: img → canvas → captureStream → MediaRecorder
      if (!startIpRecording) return;

      // Start drawing frames to canvas
      drawToCanvas?.();

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
        const recorder = startIpRecording();
        if (!recorder) {
          toast({
            title: 'Error',
            description: 'Failed to create recorder for IP camera',
            variant: 'destructive',
          });
          stopGpsTracking();
          return;
        }

        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
            console.log(`IP cam chunk: ${event.data.size} bytes`);
          }
        };

        recorder.onstop = async () => {
          console.log(`IP recording stopped with ${chunksRef.current.length} chunks`);
          stopIpStream?.();
          const finalDuration = getRecordingDuration();
          console.log(`Final IP recording duration: ${finalDuration} seconds`);

          await uploadRecording(
            chunksRef.current,
            setLoading,
            setIsRecording,
            setRecordingTime,
            finalDuration
          );
          chunksRef.current = [];
        };

        recorder.start(1000);
        setIsRecording(true);
        startTimer();

        toast({
          title: 'Recording started',
          description: gpsStarted ? 'IP Camera recording with GPS.' : 'IP Camera recording without GPS.',
        });
      } catch (err) {
        console.error('Error starting IP camera recording:', err);
        toast({
          title: 'Recording Error',
          description: 'Failed to start IP camera recording',
          variant: 'destructive',
        });
        stopGpsTracking();
      }
      return;
    }

    // Existing device camera flow
    if (!videoRef.current?.srcObject) {
      toast({
        title: 'Error',
        description: 'Camera not initialized',
        variant: 'destructive',
      });
      return;
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
      const stream = videoRef.current.srcObject as MediaStream;
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

  // For IP camera, we don't need device camera permission or a selected device camera
  const canRecord = isIpCamera
    ? !!selectedCamera
    : !!selectedCamera && cameraPermission !== false && cameraError === null;

  return (
    <VideoStatus
      isRecording={isRecording}
      loading={loading}
      selectedCamera={selectedCamera}
      cameraPermission={isIpCamera ? true : cameraPermission}
      error={isIpCamera ? null : cameraError}
      startRecording={handleStartRecording}
      stopRecording={handleStopRecording}
    />
  );
};

export default RecordingControls;

