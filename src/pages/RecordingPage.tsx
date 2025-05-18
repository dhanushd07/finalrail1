
import React, { useEffect, useState } from 'react';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { UsbConnected, UsbOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { toast } from '@/hooks/use-toast';

const RecordingPage: React.FC = () => {
  const [isNative, setIsNative] = useState<boolean>(false);
  const [usbCameraConnected, setUsbCameraConnected] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in native environment
    setIsNative(Capacitor.isNativePlatform());

    // Setup USB camera detection if in native environment
    if (Capacitor.isNativePlatform()) {
      console.log('Running in native platform, setting up USB camera detection');
      
      // Use the Capacitor plugin bridge to communicate with native code
      // This is a mock of the events - in real implementation, these would come from native plugin
      document.addEventListener('usbCameraConnected', () => {
        console.log('USB camera connected event received');
        setUsbCameraConnected(true);
        toast({
          title: 'USB Camera Connected',
          description: 'External camera detected and ready to use',
        });
      });
      
      document.addEventListener('usbCameraDisconnected', () => {
        console.log('USB camera disconnected event received');
        setUsbCameraConnected(false);
        toast({
          title: 'USB Camera Disconnected',
          description: 'External camera was disconnected',
          variant: 'destructive'
        });
      });
      
      // Initiate USB camera detection (would call native side)
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UsbCamera) {
        try {
          window.Capacitor.Plugins.UsbCamera.initialize();
          console.log('USB camera detection initialized');
        } catch (error) {
          console.error('Failed to initialize USB camera detection:', error);
        }
      } else {
        console.log('UsbCamera plugin not available yet');
      }
    }
    
    return () => {
      if (Capacitor.isNativePlatform()) {
        document.removeEventListener('usbCameraConnected', () => {});
        document.removeEventListener('usbCameraDisconnected', () => {});
      }
    };
  }, []);

  return (
    <>
      {isNative && (
        <div className="fixed top-4 left-4 z-50 p-2 bg-black/70 rounded-full">
          {usbCameraConnected ? (
            <UsbConnected className="h-6 w-6 text-green-400" />
          ) : (
            <UsbOff className="h-6 w-6 text-gray-400" />
          )}
        </div>
      )}
      <VideoRecorder />
      <Toaster />
    </>
  );
};

export default RecordingPage;
