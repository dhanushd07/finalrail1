import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Video, StopCircle, AlertCircle, CameraOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFile, createVideoRecord } from '@/lib/supabase';
import { GPSCoordinate } from '@/types';

interface MediaDeviceInfo {
  deviceId: string;
  kind: string;
  label: string;
  groupId: string;
}

const VideoRecorder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const gpsLogRef = useRef<GPSCoordinate[]>([]);
  const gpsWatchIdRef = useRef<number | null>(null);
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const getCameras = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        
        setCameraPermission(true);
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          setError('No cameras available');
          return;
        }
        
        setCameras(videoDevices as MediaDeviceInfo[]);
        setTimeout(() => {
          setSelectedCamera(videoDevices[0].deviceId || `camera-${0}`);
        }, 100);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Failed to access camera. Please check permissions.');
        setCameraPermission(false);
      }
    };
    
    getCameras();
    
    return () => {
      stopRecording();
      if (gpsWatchIdRef.current) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (selectedCamera) {
      setupCamera();
    }
  }, [selectedCamera]);
  
  const setupCamera = async () => {
    try {
      setError(null);
      
      if (mediaRecorderRef.current && isRecording) {
        stopRecording();
      }
      
      if (videoRef.current && videoRef.current.srcObject) {
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
      setError('Failed to access selected camera. The device may be in use by another application.');
    }
  };
  
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'GPS not available',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive',
      });
      return false;
    }
    
    gpsLogRef.current = [];
    
    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = new Date().toISOString();
        
        gpsLogRef.current.push({
          timestamp,
          latitude,
          longitude,
          accuracy
        });
        
        setGpsAccuracy(accuracy);
        setGpsEnabled(true);
      },
      (error) => {
        console.error('GPS error:', error);
        setGpsEnabled(false);
        toast({
          title: 'GPS Error',
          description: 'Failed to access your location. Please check permissions.',
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
    
    return true;
  };
  
  const stopGpsTracking = () => {
    if (gpsWatchIdRef.current) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
  };
  
  const startRecording = async () => {
    setError(null);
    
    if (!videoRef.current?.srcObject) {
      setError('Camera not initialized');
      return;
    }
    
    const gpsStarted = startGpsTracking();
    if (!gpsStarted) {
      setError('GPS tracking could not be started');
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
      setError('Failed to start recording');
      stopGpsTracking();
    }
  };
  
  const uploadToStorage = async (bucket: string, path: string, file: File) => {
    try {
      await uploadFile(bucket, path, file);
      console.log(`Successfully uploaded file to ${bucket}/${path}`);
    } catch (err) {
      console.error(`Error uploading file to ${bucket}/${path}:`, err);
      throw err;
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
            setError('Video size exceeds 50MB limit. Please record a shorter video.');
            setIsRecording(false);
            setRecordingTime(0);
            stopGpsTracking();
            if (timerRef.current) clearInterval(timerRef.current);
            setLoading(false);
            return;
          }
          
          const gpsLogHeader = 'timestamp,latitude,longitude,accuracy';
          const gpsLogRows = gpsLogRef.current.map(coord => 
            `${coord.timestamp},${coord.latitude},${coord.longitude},${coord.accuracy || 0}`
          );
          const gpsLogContent = [gpsLogHeader, ...gpsLogRows].join('\n');
          const gpsLogBlob = new Blob([gpsLogContent], { type: 'text/csv' });
          
          if (!user) {
            throw new Error('User not authenticated');
          }
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const videoFileName = `${user.id}/${timestamp}/video.webm`;
          const gpsLogFileName = `${user.id}/${timestamp}/gps_log.csv`;
          
          const videoFile = new File([videoBlob], 'video.webm');
          const gpsLogFile = new File([gpsLogBlob], 'gps_log.csv');
          
          try {
            await uploadToStorage('videos', videoFileName, videoFile);
            await uploadToStorage('gps-logs', gpsLogFileName, gpsLogFile);
          } catch (uploadError) {
            toast({
              title: 'Upload Failed',
              description: 'There was an error uploading your files. Please try again.',
              variant: 'destructive',
            });
            throw uploadError;
          }
          
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
          setError('Failed to save recording');
          toast({
            title: 'Recording Error',
            description: 'Failed to save your recording. Please try again.',
            variant: 'destructive',
          });
        } finally {
          chunksRef.current = [];
          gpsLogRef.current = [];
          setIsRecording(false);
          setRecordingTime(0);
          stopGpsTracking();
          setLoading(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      };
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
            <div className="flex flex-col space-y-2">
              <label htmlFor="camera-select" className="text-sm font-medium">
                Select Camera
              </label>
              <Select
                value={selectedCamera}
                onValueChange={setSelectedCamera}
                disabled={isRecording || loading}
              >
                <SelectTrigger id="camera-select" className="w-full">
                  <SelectValue placeholder="Select a camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId || `camera-${cameras.indexOf(camera)}`}>
                      {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              {cameraPermission === false ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900">
                  <CameraOff className="h-12 w-12 mb-2 opacity-60" />
                  <p className="text-center px-4">
                    Camera access denied. Please check your browser permissions and refresh the page.
                  </p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
              
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1 rounded-full">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span>{formatTime(recordingTime)}</span>
                </div>
              )}
              
              {gpsEnabled && (
                <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1 rounded-full">
                  <span className="text-xs">
                    GPS: {gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)}m` : 'Connecting...'}
                  </span>
                </div>
              )}
            </div>
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
