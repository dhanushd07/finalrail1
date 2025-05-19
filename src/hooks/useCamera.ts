
import { useState, useEffect } from 'react';

interface UseCameraReturn {
  cameras: MediaDeviceInfo[];
  selectedCamera: string;
  setSelectedCamera: (camera: string) => void;
  cameraPermission: boolean | null;
  error: string | null;
  ipCameraUrl: string;
  setIpCameraUrl: (url: string) => void;
  isIpCamera: boolean;
}

export const useCamera = (): UseCameraReturn => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ipCameraUrl, setIpCameraUrl] = useState<string>('');
  const [isIpCamera, setIsIpCamera] = useState<boolean>(false);

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
        
        setCameras(videoDevices);
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
  }, []);

  // Update isIpCamera flag whenever selectedCamera changes
  useEffect(() => {
    setIsIpCamera(selectedCamera === 'ip-camera');
  }, [selectedCamera]);

  return {
    cameras,
    selectedCamera,
    setSelectedCamera,
    cameraPermission,
    error,
    ipCameraUrl,
    setIpCameraUrl,
    isIpCamera
  };
};
