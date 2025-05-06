
import { useState, useRef, useCallback } from 'react';
import { GPSCoordinate } from '@/types';

interface UseGPSReturn {
  gpsEnabled: boolean;
  gpsAccuracy: number | null;
  gpsLogRef: React.MutableRefObject<GPSCoordinate[]>;
  startGpsTracking: () => boolean;
  stopGpsTracking: () => void;
  generateGpsLogContent: () => string;
}

export const useGPS = (): UseGPSReturn => {
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const gpsLogRef = useRef<GPSCoordinate[]>([]);
  const gpsWatchIdRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return false;
    }
    
    // Clear previous GPS data
    gpsLogRef.current = [];
    recordingStartTimeRef.current = Date.now();
    
    console.log('Starting GPS tracking');
    
    try {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          console.log(`Initial GPS position: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
          
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
          // Continue even if initial position fails
          setGpsEnabled(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Increased timeout
          maximumAge: 0
        }
      );
      
      // Start watching position
      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          if (!recordingStartTimeRef.current) {
            recordingStartTimeRef.current = Date.now();
          }
          
          const second = Math.floor(
            (Date.now() - recordingStartTimeRef.current) / 1000
          );
          
          console.log(`GPS update at ${second}s: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
          
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
          // Don't disable GPS tracking on errors, just log them
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Increased timeout
          maximumAge: 0
        }
      );
      
      return true;
    } catch (e) {
      console.error('Error setting up GPS tracking:', e);
      return false;
    }
  }, []);

  const stopGpsTracking = useCallback(() => {
    if (gpsWatchIdRef.current) {
      console.log('Stopping GPS tracking');
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    recordingStartTimeRef.current = null;
    console.log(`Collected ${gpsLogRef.current.length} GPS coordinates`);
  }, []);

  // Add a function to generate CSV content for the GPS log
  const generateGpsLogContent = useCallback(() => {
    const header = 'second,latitude,longitude,accuracy';
    
    // Handle empty GPS data
    if (gpsLogRef.current.length === 0) {
      // Add a fallback coordinate if no GPS data was collected
      const fallbackCoord = {
        second: 0,
        latitude: 0,
        longitude: 0,
        accuracy: 0
      };
      
      const fallbackRow = `${fallbackCoord.second},${fallbackCoord.latitude},${fallbackCoord.longitude},${fallbackCoord.accuracy}`;
      console.warn('No GPS coordinates collected, using fallback data');
      return `${header}\n${fallbackRow}`;
    }
    
    const rows = gpsLogRef.current.map(coord => {
      return `${coord.second},${coord.latitude},${coord.longitude},${coord.accuracy || 0}`;
    });
    
    const content = [header, ...rows].join('\n');
    console.log(`Generated GPS log with ${rows.length} entries`);
    return content;
  }, []);

  return {
    gpsEnabled,
    gpsAccuracy,
    gpsLogRef,
    startGpsTracking,
    stopGpsTracking,
    generateGpsLogContent
  };
};
