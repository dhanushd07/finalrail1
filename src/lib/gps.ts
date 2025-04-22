
import { GPSCoordinate } from '@/types';

export const matchFrameToGPS = (currentTime: number, gpsCoordinates: GPSCoordinate[]): GPSCoordinate | null => {
  if (!gpsCoordinates.length) return null;
  
  // Find closest GPS coordinate based on timestamp
  const closest = gpsCoordinates.reduce((prev, curr) => {
    const prevDiff = Math.abs(prev.second - currentTime);
    const currDiff = Math.abs(curr.second - currentTime);
    return currDiff < prevDiff ? curr : prev;
  });

  return closest;
};
