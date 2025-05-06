
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
    
    if (parts.length >= 3) {
      try {
        // Second-based format (we're standardized on this now)
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
