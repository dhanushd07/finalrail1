
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseCameraSetupProps {
  selectedCamera: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  stopRecording: () => void;
  ipCameraUrl?: string;
  isIpCamera?: boolean;
}

export function useCameraSetup({ 
  selectedCamera, 
  videoRef, 
  isRecording, 
  stopRecording,
  ipCameraUrl = '',
  isIpCamera = false
}: UseCameraSetupProps) {
  const { toast } = useToast();

  useEffect(() => {
    async function setupCamera() {
      try {
        if (isRecording) stopRecording();

        if (videoRef.current?.srcObject) {
          const existingStream = videoRef.current.srcObject as MediaStream;
          existingStream.getTracks().forEach(track => track.stop());
        }

        // Handle IP camera
        if (isIpCamera && ipCameraUrl) {
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            
            // For ESP32-CAM, we need to handle the MJPEG stream properly
            // Use the /stream endpoint for ESP32-CAM
            let url = ipCameraUrl;
            if (!url.endsWith('/')) url += '/';
            
            // Check if the URL already contains a stream endpoint
            if (!url.includes('/stream')) {
              url += 'stream';
            }
            
            videoRef.current.src = url;
            videoRef.current.crossOrigin = "anonymous";
            console.log('IP Camera URL set:', url);
            
            // Handle errors
            videoRef.current.onerror = () => {
              console.error('Failed to load IP camera stream');
              toast({
                title: 'Camera Error',
                description: 'Failed to connect to IP camera stream. Please check the URL and ensure the ESP32-CAM is running properly.',
                variant: 'destructive',
              });
            };
            
            return;
          }
        } 
        // Handle regular camera
        else if (selectedCamera && selectedCamera !== 'ip-camera') {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedCamera } },
            audio: true,
          });
          
          if (videoRef.current) {
            videoRef.current.src = ''; // Clear any existing src attribute
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.error('Error setting up camera:', err);
        toast({
          title: 'Camera Error',
          description: 'Failed to access selected camera. The device may be in use by another application.',
          variant: 'destructive',
        });
      }
    }
    
    setupCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, ipCameraUrl, isIpCamera]);
}
