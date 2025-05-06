
import { useState, useRef, useCallback, useEffect } from 'react';
import { GPSCoordinate } from '@/types';
import { generatePerSecondGPS } from '@/lib/video/gpsUtils';

interface UseGPSReturn {
  gpsEnabled: boolean;
  gpsAccuracy: number | null;
  gpsLogRef: React.MutableRefObject<GPSCoordinate[]>;
  recordingDuration: number;
  startGpsTracking: () => boolean;
  stopGpsTracking: () => void;
  generateGpsLogContent: (videoDurationSeconds?: number) => string;
}

export const useGPS = (): UseGPSReturn => {
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const gpsLogRef = useRef<GPSCoordinate[]>([]);
  const gpsWatchIdRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return false;
    }
    
    // Clear previous GPS data
    gpsLogRef.current = [];
    recordingStartTimeRef.current = Date.now();
    setRecordingDuration(0);
    
    console.log('Starting GPS tracking');
    
    // Start a timer to track recording duration
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    durationIntervalRef.current = setInterval(() => {
      if (recordingStartTimeRef.current) {
        const durationSecs = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(durationSecs);
      }
    }, 1000) as unknown as number;
    
    try {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          console.log(`Initial GPS position: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
          
          gpsLogRef.current.push({
            second: 1, // Start at 1 instead of 0
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
          
          const second = Math.max(1, Math.floor(
            (Date.now() - recordingStartTimeRef.current) / 1000
          ));
          
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
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    recordingStartTimeRef.current = null;
    console.log(`Collected ${gpsLogRef.current.length} GPS coordinates`);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGpsTracking();
    };
  }, [stopGpsTracking]);

  // Add a function to generate CSV content for the GPS log
  const generateGpsLogContent = useCallback((videoDurationSeconds?: number) => {
    const header = 'second,latitude,longitude,accuracy';
    
    // Handle empty GPS data
    if (gpsLogRef.current.length === 0) {
      // Add a fallback coordinate if no GPS data was collected
      const fallbackCoord = {
        second: 1,
        latitude: 0,
        longitude: 0,
        accuracy: 0
      };
      
      const fallbackRow = `${fallbackCoord.second},${fallbackCoord.latitude},${fallbackCoord.longitude},${fallbackCoord.accuracy}`;
      console.warn('No GPS coordinates collected, using fallback data');
      return `${header}\n${fallbackRow}`;
    }
    
    // Use either provided video duration or the tracked recording duration
    const duration = videoDurationSeconds || recordingDuration || 0;
    
    // Generate data for each second from 1 to video duration
    const perSecondCoords = generatePerSecondGPS(gpsLogRef.current, duration);
    
    // If we couldn't generate per-second coordinates, use raw collected data
    const coordsToUse = perSecondCoords.length > 0 ? perSecondCoords : gpsLogRef.current;
    
    // Convert coordinates to CSV rows
    const rows = coordsToUse.map(coord => {
      return `${coord.second},${coord.latitude},${coord.longitude},${coord.accuracy || 0}`;
    });
    
    const content = [header, ...rows].join('\n');
    console.log(`Generated GPS log with ${rows.length} entries`);
    return content;
  }, [recordingDuration]);

  return {
    gpsEnabled,
    gpsAccuracy,
    gpsLogRef,
    recordingDuration,
    startGpsTracking,
    stopGpsTracking,
    generateGpsLogContent
  };
};
