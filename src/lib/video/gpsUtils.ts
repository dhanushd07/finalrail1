
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
        
        // Skip records with invalid coordinates (0,0)
        if (parseFloat(latitude) === 0 && parseFloat(longitude) === 0) {
          console.warn(`Skipping invalid GPS coordinate at second ${second}: (0,0)`);
          continue;
        }
        
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

  // Try to find exact match by second
  const exactMatch = gpsCoordinates.find(coord => coord.second === frameSecond);
  if (exactMatch) {
    return exactMatch;
  }

  // Find closest coordinate by second
  let closestCoordinate: GPSCoordinate | null = null;
  let smallestSecondDiff = Infinity;

  for (const coordinate of gpsCoordinates) {
    const secondDiff = Math.abs(frameSecond - coordinate.second);

    if (secondDiff < smallestSecondDiff) {
      smallestSecondDiff = secondDiff;
      closestCoordinate = coordinate;
    }
  }

  // Only return if within acceptable time difference (5 seconds)
  if (closestCoordinate && smallestSecondDiff <= 5) {
    return closestCoordinate;
  }

  return undefined;
};

/**
 * Ensure we have GPS coordinates for every second of video by:
 * 1. Using exact GPS data if available
 * 2. Interpolating between known points
 * 3. Reusing the same coordinates for consecutive seconds if GPS didn't change
 */
export const ensureCompleteGPSData = (
  coordinates: GPSCoordinate[],
  durationSeconds: number
): GPSCoordinate[] => {
  // If no coordinates provided, return empty array
  if (!coordinates || coordinates.length === 0) {
    console.warn("No GPS coordinates available, returning empty array");
    return [];
  }
  
  console.log(`Ensuring complete GPS data for ${durationSeconds} seconds with ${coordinates.length} raw coordinates`);

  // Debug log the raw coordinates
  coordinates.forEach((coord, i) => {
    console.log(`Raw GPS coordinate ${i}: second=${coord.second}, lat=${coord.latitude}, lng=${coord.longitude}`);
  });
  
  const result: GPSCoordinate[] = [];
  
  // Sort coordinates by second
  const sortedCoords = [...coordinates].sort((a, b) => a.second - b.second);
  
  // For each second of the video - IMPORTANT: start from 1 for the CSV file
  for (let second = 1; second <= durationSeconds; second++) {
    // Look for exact match
    const exactMatch = sortedCoords.find(c => c.second === second);
    
    if (exactMatch) {
      console.log(`Second ${second}: Using exact GPS match`);
      result.push(exactMatch);
      continue;
    }
    
    // Find coordinates before and after this second
    const before = sortedCoords.filter(c => c.second < second).sort((a, b) => b.second - a.second)[0];
    const after = sortedCoords.filter(c => c.second > second).sort((a, b) => a.second - b.second)[0];
    
    // If we have both before and after, interpolate
    if (before && after) {
      const ratio = (second - before.second) / (after.second - before.second);
      const latitude = before.latitude + ratio * (after.latitude - before.latitude);
      const longitude = before.longitude + ratio * (after.longitude - before.longitude);
      const accuracy = before.accuracy || 0;
      
      console.log(`Second ${second}: Interpolating between seconds ${before.second} and ${after.second}`);
      result.push({
        second,
        latitude,
        longitude,
        accuracy
      });
    }
    // Otherwise use the closest one
    else if (before) {
      console.log(`Second ${second}: Using latest GPS from second ${before.second} (no change in coordinates)`);
      result.push({
        second,
        latitude: before.latitude,
        longitude: before.longitude,
        accuracy: before.accuracy
      });
    }
    else if (after) {
      console.log(`Second ${second}: Using earliest GPS from second ${after.second} (no earlier data available)`);
      result.push({
        second,
        latitude: after.latitude,
        longitude: after.longitude,
        accuracy: after.accuracy
      });
    }
    // If there's no GPS data at all but we know we have some coordinates, use the first one as fallback
    else if (sortedCoords.length > 0) {
      console.log(`Second ${second}: Using fallback GPS from first coordinate`);
      const firstCoord = sortedCoords[0];
      result.push({
        second,
        latitude: firstCoord.latitude,
        longitude: firstCoord.longitude,
        accuracy: firstCoord.accuracy
      });
    }
    // In the very unlikely case we reach here (should never happen if we check length at start)
    else {
      console.error(`Second ${second}: No GPS data available at all, using (0,0)`);
      result.push({
        second,
        latitude: 0,
        longitude: 0,
        accuracy: 0
      });
    }
  }
  
  console.log(`Generated ${result.length} GPS coordinates, one for each second of video`);
  
  // Debug log the final result
  result.forEach((coord, i) => {
    console.log(`Final GPS coordinate ${i}: second=${coord.second}, lat=${coord.latitude}, lng=${coord.longitude}`);
  });
  
  return result;
};
