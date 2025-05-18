
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

interface UseCameraSetupProps {
  selectedCamera: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  stopRecording: () => void;
  isExternalCamera?: boolean;
}

export function useCameraSetup({ selectedCamera, videoRef, isRecording, stopRecording, isExternalCamera }: UseCameraSetupProps) {
  const { toast } = useToast();

  useEffect(() => {
    async function setupCamera() {
      try {
        if (isRecording) stopRecording();

        if (videoRef.current?.srcObject) {
          const existingStream = videoRef.current.srcObject as MediaStream;
          existingStream.getTracks().forEach(track => track.stop());
        }

        // Special handling for external USB cameras on native platform
        if (isExternalCamera && Capacitor.isNativePlatform() && window.Capacitor?.Plugins?.UsbCamera) {
          try {
            console.log('Setting up external USB camera');
            // This would be a call to the native plugin to get a stream from the USB camera
            // In a real implementation, this would return something that could be set as srcObject
            // For now, we'll mock this with regular getUserMedia
            
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: selectedCamera } },
              audio: true,
            });
            
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (err) {
            console.error('Error setting up external USB camera:', err);
            toast({
              title: 'USB Camera Error',
              description: 'Failed to access external USB camera. Please check connections.',
              variant: 'destructive',
            });
          }
        } else {
          // Regular camera setup
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedCamera } },
            audio: true,
          });
          if (videoRef.current) {
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
    if (selectedCamera) setupCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera]);
}
