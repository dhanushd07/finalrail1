
import { useState } from 'react';
import { extractFrames } from '@/lib/video/extractFrames';

interface UseVideoProcessingReturn {
  extractingFrames: boolean;
  extractFramesFromVideo: (videoBlob: Blob, fps?: number) => Promise<Blob[]>;
  error: string | null;
}

export function useVideoProcessing(): UseVideoProcessingReturn {
  const [extractingFrames, setExtractingFrames] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const extractFramesFromVideo = async (videoBlob: Blob, fps: number = 1): Promise<Blob[]> => {
    try {
      setExtractingFrames(true);
      setError(null);
      
      console.log(`Starting frame extraction process from ${videoBlob.size} byte video`);
      const frames = await extractFrames(videoBlob, fps);
      console.log(`Successfully extracted ${frames.length} frames`);
      
      return frames;
    } catch (err) {
      console.error('Error during frame extraction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during frame extraction';
      setError(errorMessage);
      return [];
    } finally {
      setExtractingFrames(false);
    }
  };

  return {
    extractingFrames,
    extractFramesFromVideo,
    error
  };
}
