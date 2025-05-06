
import { GPSCoordinate } from '@/types';

/**
 * Parse a GPS log in CSV format into an array of coordinates.
 */
export const parseGPSLog = (gpsLogContent: string): GPSCoordinate[] => {
  console.log('Parsing GPS log content:', gpsLogContent.substring(0, 100) + '...');
  
  if (!gpsLogContent || gpsLogContent.trim() === '') {
    console.error('Empty GPS log content');
    return [];
  }
  
  const lines = gpsLogContent.split('\n').filter(line => line.trim().length > 0);
  console.log(`Found ${lines.length} lines in GPS log`);
  
  if (lines.length <= 1) {
    console.warn('GPS log contains only header or is empty');
    return [];
  }
  
  const header = lines[0].toLowerCase();
  const dataLines = lines.slice(1);
  const coordinates: GPSCoordinate[] = [];
  
  for (const line of dataLines) {
    const parts = line.split(',');
    console.log(`Processing GPS line: ${line}`);
    
    if (parts.length >= 3) {
      try {
        // Always expect the format: second, latitude, longitude, accuracy
        const [second, latitude, longitude, accuracy] = parts;
        
        coordinates.push({
          second: parseInt(second, 10),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : undefined,
        });
      } catch (e) {
        console.error('Failed to parse GPS line:', line, e);
      }
    } else {
      console.warn('Invalid GPS data format:', line);
    }
  }
  
  console.log(`Successfully parsed ${coordinates.length} GPS coordinates`);
  return coordinates;
};

/**
 * Match a frame second with the closest GPS coordinate (within 5s).
 */
export const matchFrameToGPS = (
  frameSecond: number,
  gpsCoordinates: GPSCoordinate[]
): GPSCoordinate | undefined => {
  if (!gpsCoordinates || gpsCoordinates.length === 0) {
    return undefined;
  }

  const exactMatch = gpsCoordinates.find(coord => coord.second === frameSecond);
  if (exactMatch) {
    return exactMatch;
  }

  let closestCoordinate: GPSCoordinate | null = null;
  let smallestSecondDiff = Infinity;

  for (const coordinate of gpsCoordinates) {
    const secondDiff = Math.abs(frameSecond - coordinate.second);

    if (secondDiff < smallestSecondDiff) {
      smallestSecondDiff = secondDiff;
      closestCoordinate = coordinate;
    }
  }

  if (closestCoordinate && smallestSecondDiff <= 5) {
    return closestCoordinate;
  }

  return undefined;
};

/**
 * Generate GPS coordinates for each second between 1 and videoDuration
 * using the collected GPS data.
 */
export const generatePerSecondGPS = (
  gpsCoordinates: GPSCoordinate[],
  videoDuration: number
): GPSCoordinate[] => {
  if (!gpsCoordinates || gpsCoordinates.length === 0) {
    console.warn('No GPS coordinates to interpolate');
    return [];
  }

  // Create an array to hold coordinates for each second
  const perSecondCoords: GPSCoordinate[] = [];
  
  // Ensure video duration is at least 1 second
  const duration = Math.max(1, Math.floor(videoDuration));
  
  // For each second from 1 to video duration
  for (let second = 1; second <= duration; second++) {
    // Try to find an exact match for this second
    const exactMatch = gpsCoordinates.find(coord => coord.second === second);
    
    if (exactMatch) {
      // We have an exact match, use it
      perSecondCoords.push(exactMatch);
    } else {
      // Find the closest coordinate before and after this second
      const before = [...gpsCoordinates]
        .filter(coord => coord.second < second)
        .sort((a, b) => b.second - a.second)[0];
      
      const after = [...gpsCoordinates]
        .filter(coord => coord.second > second)
        .sort((a, b) => a.second - b.second)[0];
      
      if (before && after) {
        // Interpolate between the two points
        const ratio = (second - before.second) / (after.second - before.second);
        const interpolatedLat = before.latitude + ratio * (after.latitude - before.latitude);
        const interpolatedLng = before.longitude + ratio * (after.longitude - before.longitude);
        
        perSecondCoords.push({
          second,
          latitude: interpolatedLat,
          longitude: interpolatedLng,
          accuracy: Math.max(before.accuracy || 0, after.accuracy || 0)
        });
      } else if (before) {
        // Only have data before this point, use the last known position
        perSecondCoords.push({
          second,
          latitude: before.latitude,
          longitude: before.longitude,
          accuracy: before.accuracy
        });
      } else if (after) {
        // Only have data after this point, use the first known position
        perSecondCoords.push({
          second,
          latitude: after.latitude,
          longitude: after.longitude,
          accuracy: after.accuracy
        });
      }
    }
  }
  
  return perSecondCoords;
};
