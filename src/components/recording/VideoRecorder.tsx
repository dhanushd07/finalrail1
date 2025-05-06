
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
import { Progress } from '@/components/ui/progress';

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
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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

    // Reset any previous upload progress
    setUploadProgress(0);

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
        videoBitsPerSecond: 2500000 // Set a moderate bitrate to reduce file size
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
        
        // Create a temporary video element to get the duration in a non-blocking way
        setTimeout(() => {
          const tempVideo = document.createElement('video');
          const tempVideoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
          const tempVideoUrl = URL.createObjectURL(tempVideoBlob);
          
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
          
          tempVideo.onerror = async () => {
            console.error('Error loading video metadata, using recordingDuration instead');
            // Fallback to using recorded time
            await uploadRecording(
              chunksRef.current,
              setLoading,
              setIsRecording,
              setRecordingTime,
              recordingDuration
            );
            
            URL.revokeObjectURL(tempVideoUrl);
            chunksRef.current = [];
            stopTimer();
          };
          
          tempVideo.src = tempVideoUrl;
          tempVideo.load();
        }, 100); // Small delay to prevent UI blocking
      };

      console.log('Starting MediaRecorder');
      // Request data chunks at shorter intervals to better handle memory
      mediaRecorderRef.current.start(500);
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
      // Set initial progress to indicate upload is starting
      setUploadProgress(5);
      // Simulate upload progress to give user feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 300);
      
      // Clear this interval after a timeout - upload should be done
      setTimeout(() => {
        clearInterval(progressInterval);
        setUploadProgress(100);
      }, 10000);
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
            
            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Uploading video: {uploadProgress}%</div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {isRecording
              ? 'Recording in progress...'
              : loading 
                ? 'Processing and uploading...'
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
