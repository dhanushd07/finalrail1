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
  isIpCamera = false
}) => {
  const { toast } = useToast();

  const handleStartRecording = async () => {
    if (!videoRef.current) {
      toast({
        title: 'Error',
        description: 'Video element not initialized',
        variant: 'destructive',
      });
      return;
    }

    // For IP camera, we need to create a canvas to capture frames from the video
    if (isIpCamera) {
      try {
        // Make sure video is playing
        await videoRef.current.play();
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        
        // Set canvas dimensions to match video
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        // Create a stream from canvas
        const canvasStream = canvas.captureStream(30); // 30 fps
        
        // Add audio track if available
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(track => {
            canvasStream.addTrack(track);
          });
        } catch (e) {
          console.warn('Could not get audio:', e);
          toast({
            title: 'Audio Warning',
            description: 'Could not access microphone. Recording without audio.',
            variant: 'default',
          });
        }
        
        // Start drawing video to canvas
        const drawVideo = () => {
          if (videoRef.current && ctx && isRecording) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            requestAnimationFrame(drawVideo);
          }
        };
        
        // Start GPS tracking
        const gpsStarted = startGpsTracking();
        if (!gpsStarted) {
          console.warn('GPS tracking could not be started, continuing without GPS');
          toast({
            title: 'GPS Warning',
            description: 'GPS tracking could not be started. Location data may be limited.',
            variant: 'default',
          });
        }
        
        // Set up MediaRecorder with canvas stream
        const options = { 
          mimeType: 'video/webm;codecs=vp9,opus',
          videoBitsPerSecond: 500000 // Lower bitrate for better performance
        };
        
        // Try the specified mime type first
        if (MediaRecorder.isTypeSupported(options.mimeType)) {
          mediaRecorderRef.current = new MediaRecorder(canvasStream, options);
          console.log(`Using ${options.mimeType} for recording with ${options.videoBitsPerSecond}bps`);
        } else {
          // Fallback to browser default
          console.log(`${options.mimeType} not supported, using browser default`);
          mediaRecorderRef.current = new MediaRecorder(canvasStream);
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
        
        // Start recording
        console.log('Starting MediaRecorder for IP camera');
        mediaRecorderRef.current.start(1000); // Capture data every second
        setIsRecording(true);
        startTimer();
        
        // Start drawing video frames to canvas
        drawVideo();
        
        toast({
          title: 'Recording started',
          description: gpsStarted ? 'GPS tracking is active. Recording IP camera stream.' : 'Recording IP camera stream without GPS.',
        });
        
      } catch (err) {
        console.error('Error starting IP camera recording:', err);
        toast({
          title: 'Recording Error',
          description: 'Failed to start recording from IP camera',
          variant: 'destructive',
        });
        stopGpsTracking();
      }
      return;
    }
    
    // Regular camera recording logic (unchanged)
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
      // Continue anyway - don't return
    }

    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const options = { 
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 500000 // Lower bitrate for better performance
      };
      
      // Try the specified mime type first
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        console.log(`Using ${options.mimeType} for recording with ${options.videoBitsPerSecond}bps`);
      } else {
        // Fallback to browser default
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
      mediaRecorderRef.current.start(1000); // Capture data every second
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
      stopTimer(); // Make sure we stop the timer before calculating the final duration
    }
  };

  return (
    <VideoStatus
      isRecording={isRecording}
      loading={loading}
      selectedCamera={selectedCamera}
      cameraPermission={cameraPermission}
      error={cameraError}
      startRecording={handleStartRecording}
      stopRecording={handleStopRecording}
    />
  );
};

export default RecordingControls;
