
import { useState, useRef } from 'react';
import { GPSCoordinate } from '@/types';

interface UseGPSReturn {
  gpsEnabled: boolean;
  gpsAccuracy: number | null;
  gpsLogRef: React.MutableRefObject<GPSCoordinate[]>;
  startGpsTracking: () => boolean;
  stopGpsTracking: () => void;
}

export const useGPS = (): UseGPSReturn => {
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const gpsLogRef = useRef<GPSCoordinate[]>([]);
  const gpsWatchIdRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return false;
    }
    
    gpsLogRef.current = [];
    recordingStartTimeRef.current = Date.now();
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        gpsLogRef.current.push({
          second: 0,
          latitude,
          longitude,
          accuracy
        });
        
        setGpsAccuracy(accuracy);
        setGpsEnabled(true);
      },
      (error) => {
        console.error('Initial GPS error:', error);
        return false;
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
    
    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const second = Math.floor(
          (Date.now() - (recordingStartTimeRef.current || Date.now())) / 1000
        );
        
        gpsLogRef.current.push({
          second,
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
    recordingStartTimeRef.current = null;
  };

  return {
    gpsEnabled,
    gpsAccuracy,
    gpsLogRef,
    startGpsTracking,
    stopGpsTracking
  };
};
