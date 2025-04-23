
import { GPSCoordinate } from '@/types';

/**
 * Parse a GPS log in CSV format into an array of coordinates.
 */
export const parseGPSLog = (gpsLogContent: string): GPSCoordinate[] => {
  const lines = gpsLogContent.split('\n').filter(line => line.trim().length > 0);
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    const parts = line.split(',');

    if (parts.length >= 3 && !isNaN(Number(parts[0]))) {
      const [second, latitude, longitude, accuracy] = parts;
      return {
        second: parseInt(second, 10),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
      };
    } else if (parts.length >= 3) {
      const [timestamp, latitude, longitude, accuracy] = parts;
      return {
        second: 0,
        timestamp,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
      };
    }

    return {
      second: 0,
      latitude: 0,
      longitude: 0
    };
  });
};

/**
 * Match a frame second with the closest GPS coordinate (within 5s).
 */
export const matchFrameToGPS = (
  frameSecond: number,
  gpsCoordinates: GPSCoordinate[]
): GPSCoordinate | null => {
  if (gpsCoordinates.length === 0) {
    return null;
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

  return null;
};
