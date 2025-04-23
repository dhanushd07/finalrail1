
import { useState, useCallback } from 'react';
import { extractFrames } from '@/lib/video/extractFrames';
import { VideoFrame, GPSCoordinate } from '@/types';
import { matchFrameToGPS } from '@/lib/video/gpsUtils';

interface UseVideoProcessingReturn {
  extractingFrames: boolean;
  extractFramesFromVideo: (videoBlob: Blob, fps?: number, gpsCoordinates?: GPSCoordinate[]) => Promise<VideoFrame[]>;
  error: string | null;
}

export function useVideoProcessing(): UseVideoProcessingReturn {
  const [extractingFrames, setExtractingFrames] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const extractFramesFromVideo = useCallback(async (
    videoBlob: Blob, 
    fps: number = 1, 
    gpsCoordinates?: GPSCoordinate[]
  ): Promise<VideoFrame[]> => {
    try {
      setExtractingFrames(true);
      setError(null);
      
      console.log(`Starting frame extraction process from ${videoBlob.size} byte video at ${fps} fps`);
      
      if (!videoBlob || videoBlob.size === 0) {
        throw new Error('Invalid video blob: empty or null');
      }
      
      const frameBlobs = await extractFrames(videoBlob, fps);
      console.log(`Successfully extracted ${frameBlobs.length} frame blobs`);
      
      // Convert the raw blobs to VideoFrame objects with timestamps
      const videoFrames: VideoFrame[] = frameBlobs.map((blob, index) => {
        // Calculate approximate timestamp in seconds based on index and fps
        const timestamp = index / fps;
        
        // Match with GPS coordinates if provided
        let gpsCoordinate = undefined;
        if (gpsCoordinates && gpsCoordinates.length > 0) {
          gpsCoordinate = matchFrameToGPS(Math.floor(timestamp), gpsCoordinates);
          if (gpsCoordinate) {
            console.log(`Matched frame ${index} (${timestamp.toFixed(2)}s) with GPS: ${gpsCoordinate.latitude}, ${gpsCoordinate.longitude}`);
          }
        }
        
        return {
          blob,
          index,
          timestamp,
          gpsCoordinate
        };
      });
      
      console.log(`Processed ${videoFrames.length} frames with metadata`);
      return videoFrames;
    } catch (err) {
      console.error('Error during video processing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during video processing';
      setError(errorMessage);
      return [];
    } finally {
      setExtractingFrames(false);
    }
  }, []);

  return {
    extractingFrames,
    extractFramesFromVideo,
    error
  };
}
