
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Video, StopCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFile, createVideoRecord } from '@/lib/supabase';
import CameraSelect from './CameraSelect';
import VideoPreview from './VideoPreview';
import { useGPS } from '@/hooks/useGPS';
import { useCamera } from '@/hooks/useCamera';

const VideoRecorder: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
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

  const setupCamera = async () => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        stopRecording();
      }
      
      if (videoRef.current?.srcObject) {
        const existingStream = videoRef.current.srcObject as MediaStream;
        existingStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedCamera } },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error setting up camera:', err);
      toast({
        title: 'Camera Error',
        description: 'Failed to access selected camera. The device may be in use by another application.',
        variant: 'destructive',
      });
    }
  };

  React.useEffect(() => {
    if (selectedCamera) {
      setupCamera();
    }
  }, [selectedCamera]);

  const startRecording = async () => {
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
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      mediaRecorderRef.current.onstop = async () => {
        try {
          setLoading(true);
          
          const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
          
          if (videoBlob.size > 50 * 1024 * 1024) {
            toast({
              title: 'Error',
              description: 'Video size exceeds 50MB limit. Please record a shorter video.',
              variant: 'destructive',
            });
            return;
          }
          
          if (!user) {
            throw new Error('User not authenticated');
          }
          
          const gpsLogHeader = 'second,latitude,longitude,accuracy';
          const gpsLogRows = gpsLogRef.current.map(coord => 
            `${coord.second},${coord.latitude},${coord.longitude},${coord.accuracy || 0}`
          );
          const gpsLogContent = [gpsLogHeader, ...gpsLogRows].join('\n');
          const gpsLogBlob = new Blob([gpsLogContent], { type: 'text/csv' });
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const videoFileName = `${user.id}/${timestamp}/video.webm`;
          const gpsLogFileName = `${user.id}/${timestamp}/gps_by_second.csv`;
          
          const videoFile = new File([videoBlob], 'video.webm');
          const gpsLogFile = new File([gpsLogBlob], 'gps_by_second.csv');
          
          const videoUrl = await uploadFile('videos', videoFileName, videoFile);
          const gpsLogUrl = await uploadFile('gps-logs', gpsLogFileName, gpsLogFile);
          
          await createVideoRecord({
            user_id: user.id,
            video_url: videoFileName,
            gps_log_url: gpsLogFileName,
            status: 'Queued'
          });
          
          toast({
            title: 'Recording saved',
            description: 'Your video has been uploaded and queued for processing.',
          });
        } catch (err) {
          console.error('Error saving recording:', err);
          toast({
            title: 'Recording Error',
            description: 'Failed to save your recording. Please try again.',
            variant: 'destructive',
          });
        } finally {
          chunksRef.current = [];
          setIsRecording(false);
          setRecordingTime(0);
          stopGpsTracking();
          setLoading(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      };
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
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
          
          <div className="flex space-x-2">
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                disabled={loading || !selectedCamera || cameraPermission === false || error !== null}
                className="bg-red-600 hover:bg-red-700"
              >
                <Video className="mr-2 h-4 w-4" />
                Start Recording
              </Button>
            ) : (
              <Button 
                onClick={stopRecording} 
                variant="destructive"
                disabled={loading}
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Recording
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
      
      <div className="w-full p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">Recording Instructions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Ensure your camera has a clear view of the railway track</li>
          <li>Allow location permissions when prompted for GPS tracking</li>
          <li>Record at a consistent speed for best results</li>
          <li>Maximum video size: 50MB (approximately 2-5 minutes)</li>
          <li>After stopping, the video will be uploaded and queued for processing</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoRecorder;
