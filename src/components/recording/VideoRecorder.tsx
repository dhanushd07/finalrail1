
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
    startGpsTracking,
    stopGpsTracking
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
    toast,
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
      toast({
        title: 'GPS Error',
        description: 'GPS tracking could not be started',
        variant: 'destructive',
      });
      return;
    }

    try {
      const stream = videoRef.current.srcObject as MediaStream;
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        await uploadRecording(
          chunksRef.current,
          setLoading,
          setIsRecording,
          setRecordingTime
        );
        chunksRef.current = [];
        stopTimer();
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      startTimer();

      toast({
        title: 'Recording started',
        description: 'GPS tracking is active. Recording in progress.',
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
      mediaRecorderRef.current.stop();
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
