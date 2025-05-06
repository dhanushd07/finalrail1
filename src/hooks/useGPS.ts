
import { useState, useRef, useCallback } from 'react';
import { GPSCoordinate } from '@/types';

interface UseGPSReturn {
  gpsEnabled: boolean;
  gpsAccuracy: number | null;
  gpsLogRef: React.MutableRefObject<GPSCoordinate[]>;
  startGpsTracking: () => boolean;
  stopGpsTracking: () => void;
  generateGpsLogContent: (durationSeconds: number) => string;
  hasGpsError: boolean;
  gpsErrorMessage: string | null;
}

export const useGPS = (): UseGPSReturn => {
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [hasGpsError, setHasGpsError] = useState<boolean>(false);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const gpsLogRef = useRef<GPSCoordinate[]>([]);
  const gpsWatchIdRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setHasGpsError(true);
      setGpsErrorMessage('Geolocation is not supported by your browser');
      console.error('Geolocation is not supported by your browser');
      return false;
    }
    
    // Clear previous GPS data and errors
    gpsLogRef.current = [];
    recordingStartTimeRef.current = Date.now();
    setHasGpsError(false);
    setGpsErrorMessage(null);
    
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
          setHasGpsError(true);
          
          // Set specific error message based on error code
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setGpsErrorMessage('GPS permission denied');
              break;
            case error.POSITION_UNAVAILABLE:
              setGpsErrorMessage('GPS position unavailable');
              break;
            case error.TIMEOUT:
              setGpsErrorMessage('GPS request timed out');
              break;
            default:
              setGpsErrorMessage('Unknown GPS error');
          }
          
          // Continue even if initial position fails
          setGpsEnabled(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, 
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
          
          // If we had an error before but now we're getting data, clear the error
          if (hasGpsError) {
            setHasGpsError(false);
            setGpsErrorMessage(null);
          }
        },
        (error) => {
          console.error('GPS watch error:', error);
          setHasGpsError(true);
          
          // Set specific error message based on error code
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setGpsErrorMessage('GPS permission denied');
              break;
            case error.POSITION_UNAVAILABLE:
              setGpsErrorMessage('GPS position unavailable');
              break;
            case error.TIMEOUT:
              setGpsErrorMessage('GPS request timed out');
              break;
            default:
              setGpsErrorMessage('Unknown GPS error');
          }
          
          // Don't disable GPS tracking on errors, just log them
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
      
      return true;
    } catch (e) {
      console.error('Error setting up GPS tracking:', e);
      setHasGpsError(true);
      setGpsErrorMessage('Failed to start GPS tracking');
      return false;
    }
  }, [hasGpsError]);

  const stopGpsTracking = useCallback(() => {
    if (gpsWatchIdRef.current) {
      console.log('Stopping GPS tracking');
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    recordingStartTimeRef.current = null;
    console.log(`Collected ${gpsLogRef.current.length} GPS coordinates`);
  }, []);

  const generateGpsLogContent = useCallback((durationSeconds: number) => {
    const header = 'second,latitude,longitude,accuracy';
    console.log(`Generating GPS log for ${durationSeconds} second video`);
    
    // Ensure durationSeconds is at least 1
    durationSeconds = Math.max(1, durationSeconds);
    
    // Create an array with seconds from 1 to durationSeconds
    const rows = [];
    
    // If we have GPS data, use it to create rows
    if (gpsLogRef.current.length > 0) {
      for (let second = 1; second <= durationSeconds; second++) {
        // Find the closest GPS coordinate to this second
        let closestCoord = null;
        let smallestTimeDiff = Infinity;
        
        for (const coord of gpsLogRef.current) {
          const timeDiff = Math.abs(coord.second - second);
          if (timeDiff < smallestTimeDiff) {
            smallestTimeDiff = timeDiff;
            closestCoord = coord;
          }
        }
        
        // If we found a coordinate, use it
        if (closestCoord) {
          rows.push(`${second},${closestCoord.latitude},${closestCoord.longitude},${closestCoord.accuracy || 0}`);
        } else {
          // If no close match, use the last known position
          const lastCoord = gpsLogRef.current[gpsLogRef.current.length - 1];
          rows.push(`${second},${lastCoord.latitude},${lastCoord.longitude},${lastCoord.accuracy || 0}`);
        }
      }
    } else {
      // If no GPS data was collected, report that in the log with zeros
      for (let second = 1; second <= durationSeconds; second++) {
        rows.push(`${second},0,0,0`);
      }
      console.warn('No GPS coordinates collected, using default values (0,0) for all seconds');
    }
    
    const content = [header, ...rows].join('\n');
    console.log(`Generated GPS log with ${rows.length} entries, one per second`);
    return content;
  }, []);

  return {
    gpsEnabled,
    gpsAccuracy,
    gpsLogRef,
    startGpsTracking,
    stopGpsTracking,
    generateGpsLogContent,
    hasGpsError,
    gpsErrorMessage
  };
};
