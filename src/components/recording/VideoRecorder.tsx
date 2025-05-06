
import React, { useRef, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import CameraSelect from './CameraSelect';
import VideoPreview from './VideoPreview';
import { useGPS } from '@/hooks/useGPS';
import { useCamera } from '@/hooks/useCamera';
import VideoStatus from './VideoStatus';
import RecordingInstructions from './RecordingInstructions';

import { useVideoRecording } from '@/hooks/useVideoRecording';
import { useCameraSetup } from '@/hooks/useCameraSetup';
import { useVideoUpload } from '@/hooks/useVideoUpload';

const VideoRecorder: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Custom hooks for logical separation
  const {
    isRecording,
    setIsRecording,
    recordingTime,
    setRecordingTime,
    timerRef,
    mediaRecorderRef,
    chunksRef,
    startTimer,
    stopTimer
  } = useVideoRecording();

  const [loading, setLoading] = useState<boolean>(false);

  const {
    cameras,
    selectedCamera,
    setSelectedCamera,
    cameraPermission,
    error
  } = useCamera();

  const {
    gpsEnabled,
    gpsAccuracy,
    gpsLogRef,
    recordingDuration,
    startGpsTracking,
    stopGpsTracking,
    generateGpsLogContent
  } = useGPS();

  useCameraSetup({
    selectedCamera,
    videoRef,
    isRecording,
    stopRecording: () => handleStopRecording(),
  });

  const { uploadRecording } = useVideoUpload({
    user,
    gpsLogRef,
    stopGpsTracking,
    generateGpsLogContent
  });

  const handleStartRecording = async () => {
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
        mimeType: 'video/webm;codecs=vp9,opus'
      };
      
      // Try the specified mime type first
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        console.log(`Using ${options.mimeType} for recording`);
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
        
        // Create a temporary video element to get the duration
        const tempVideo = document.createElement('video');
        const tempVideoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        const tempVideoUrl = URL.createObjectURL(tempVideoBlob);
        
        tempVideo.src = tempVideoUrl;
        tempVideo.onloadedmetadata = async () => {
          const videoDuration = Math.ceil(tempVideo.duration);
          console.log(`Video duration: ${videoDuration} seconds`);
          
          // Now upload with the correct duration
          await uploadRecording(
            chunksRef.current,
            setLoading,
            setIsRecording,
            setRecordingTime,
            videoDuration
          );
          
          URL.revokeObjectURL(tempVideoUrl);
          chunksRef.current = [];
          stopTimer();
        };
        
        tempVideo.onerror = async (e) => {
          console.error('Error loading video metadata:', e);
          // Fallback to using recorded time
          await uploadRecording(
            chunksRef.current,
            setLoading,
            setIsRecording,
            setRecordingTime
          );
          chunksRef.current = [];
          stopTimer();
        };
        
        tempVideo.load();
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
      // uploadRecording will be called from mediaRecorder.onstop event
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 max-w-3xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Camera className="mr-2 h-6 w-6" />
            Video Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center bg-red-100 text-red-700 p-2 rounded">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <CameraSelect
              cameras={cameras}
              selectedCamera={selectedCamera}
              setSelectedCamera={setSelectedCamera}
              disabled={isRecording || loading}
            />

            <VideoPreview
              videoRef={videoRef}
              isRecording={isRecording}
              recordingTime={recordingTime}
              gpsEnabled={gpsEnabled}
              gpsAccuracy={gpsAccuracy}
              cameraPermission={cameraPermission}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {isRecording
              ? 'Recording in progress...'
              : 'Ready to record'}
          </div>
          <VideoStatus
            isRecording={isRecording}
            loading={loading}
            selectedCamera={selectedCamera}
            cameraPermission={cameraPermission}
            error={error}
            startRecording={handleStartRecording}
            stopRecording={handleStopRecording}
          />
        </CardFooter>
      </Card>

      <RecordingInstructions />
    </div>
  );
};

export default VideoRecorder;
