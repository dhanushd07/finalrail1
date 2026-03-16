
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const IP_CAMERA_VALUE = '__ip_camera__';

interface UseCameraSetupProps {
  selectedCamera: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  stopRecording: () => void;
  ipStreamUrl?: string;
}

export function useCameraSetup({ selectedCamera, videoRef, isRecording, stopRecording, ipStreamUrl }: UseCameraSetupProps) {
  const { toast } = useToast();

  // Handle device cameras
  useEffect(() => {
    if (!selectedCamera || selectedCamera === IP_CAMERA_VALUE) return;

    async function setupCamera() {
      try {
        if (isRecording) stopRecording();

        if (videoRef.current?.srcObject) {
          const existingStream = videoRef.current.srcObject as MediaStream;
          existingStream.getTracks().forEach(track => track.stop());
        }

        // Clear any IP camera src
        if (videoRef.current) {
          videoRef.current.removeAttribute('src');
          videoRef.current.srcObject = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera } },
          audio: true,
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
    }
    setupCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera]);

  // Handle IP camera - no video element setup needed, <img> handles display
  useEffect(() => {
    if (selectedCamera !== IP_CAMERA_VALUE) return;
    if (!videoRef.current) return;

    // Stop any existing device camera stream
    if (videoRef.current.srcObject) {
      const existingStream = videoRef.current.srcObject as MediaStream;
      existingStream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    videoRef.current.removeAttribute('src');
    console.log('IP Camera mode: preview handled by <img> element, recording via proxy polling');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, ipStreamUrl]);
}
