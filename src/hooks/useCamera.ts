
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface CustomMediaDeviceInfo {
  deviceId: string;
  kind: string;
  label: string;
  groupId: string;
}

interface UseCameraReturn {
  cameras: MediaDeviceInfo[];
  selectedCamera: string;
  setSelectedCamera: (camera: string) => void;
  cameraPermission: boolean | null;
  error: string | null;
  isExternalCamera?: boolean;
}

export const useCamera = (): UseCameraReturn => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExternalCamera, setIsExternalCamera] = useState<boolean>(false);

  useEffect(() => {
    const getCameras = async () => {
      try {
        // Check for native environment and USB cameras first
        if (Capacitor.isNativePlatform()) {
          if (window.Capacitor?.Plugins?.UsbCamera) {
            try {
              // This would be a call to the native plugin
              const usbCameras = await window.Capacitor.Plugins.UsbCamera.getCameras();
              if (usbCameras && usbCameras.length > 0) {
                console.log('External USB cameras found:', usbCameras);
                
                // Convert the USB camera data to match MediaDeviceInfo structure
                // We can't use setCameras directly with a custom object that doesn't implement the full MediaDeviceInfo interface
                // Instead, we'll use navigator.mediaDevices.enumerateDevices() first and then add our USB cameras
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                
                // If we have USB cameras, select the first one
                if (usbCameras.length > 0) {
                  setTimeout(() => {
                    setSelectedCamera(usbCameras[0].id || `usb-camera-0`);
                    setIsExternalCamera(true);
                  }, 100);
                }
                
                setCameraPermission(true);
                return;
              }
            } catch (err) {
              console.warn('Error accessing USB cameras, falling back to regular cameras:', err);
            }
          }
        }

        // Regular camera access fallback
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
          setIsExternalCamera(false);
        }, 100);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Failed to access camera. Please check permissions.');
        setCameraPermission(false);
      }
    };
    
    getCameras();

    // Listen for USB camera changes if in native environment
    if (Capacitor.isNativePlatform()) {
      const handleUsbCameraConnected = async () => {
        await getCameras(); // Re-detect cameras when a USB camera is connected
      };
      
      const handleUsbCameraDisconnected = async () => {
        await getCameras(); // Re-detect cameras when a USB camera is disconnected
      };
      
      document.addEventListener('usbCameraConnected', handleUsbCameraConnected);
      document.addEventListener('usbCameraDisconnected', handleUsbCameraDisconnected);
      
      return () => {
        document.removeEventListener('usbCameraConnected', handleUsbCameraConnected);
        document.removeEventListener('usbCameraDisconnected', handleUsbCameraDisconnected);
      };
    }
  }, []);

  return {
    cameras,
    selectedCamera,
    setSelectedCamera,
    cameraPermission,
    error,
    isExternalCamera
  };
};

// Add a TypeScript interface for the UsbCamera plugin
declare global {
  interface Window {
    Capacitor?: {
      Plugins?: {
        UsbCamera?: {
          initialize: () => Promise<void>;
          getCameras: () => Promise<any[]>;
        }
      }
    }
  }
}
