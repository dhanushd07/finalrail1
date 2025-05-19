
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
            videoRef.current.src = ipCameraUrl;
            videoRef.current.crossOrigin = "anonymous";
            console.log('IP Camera URL set:', ipCameraUrl);
            
            // Check if we can actually load the stream
            videoRef.current.onerror = () => {
              console.error('Failed to load IP camera stream');
              toast({
                title: 'Camera Error',
                description: 'Failed to connect to IP camera stream. Please check the URL.',
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
