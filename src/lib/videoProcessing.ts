import { supabase } from '@/integrations/supabase/client';
import { GPSCoordinate } from '@/types';
import { uploadFile } from '@/lib/supabase';
import { matchFrameToGPS } from './gps';

export const extractAndSaveFrames = async (
  videoBlob: Blob, 
  userId: string, 
  videoId: string, 
  gpsCoordinates: GPSCoordinate[], 
  fps: number = 1
): Promise<string[]> => {
  console.log('Extracting and saving frames from video at', fps, 'fps');
  
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.autoplay = false;
      video.muted = true;
      video.playsInline = true;
      
      const videoUrl = URL.createObjectURL(videoBlob);
      video.src = videoUrl;
      
      const savedFrameUrls: string[] = [];
      let currentTime = 0;
      const frameInterval = 1 / fps;
      
      video.onloadedmetadata = () => {
        const videoDuration = video.duration;
        console.log('Video duration:', videoDuration, 'seconds');
        
        video.onseeked = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(async (blob) => {
              if (blob) {
                try {
                  // Unique frame filename
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  const framePath = `${userId}/${videoId}/${timestamp}_frame.jpg`;
                  
                  // Upload frame to Supabase storage
                  const frameUrl = await uploadFile('frames', framePath, new File([blob], 'frame.jpg'));
                  
                  // Match GPS coordinates to this frame
                  const gpsCoord = matchFrameToGPS(currentTime, gpsCoordinates);
                  
                  // Save frame metadata to video_frames table
                  const { error: frameError } = await supabase
                    .from('video_frames')
                    .insert({
                      video_id: videoId,
                      user_id: userId,
                      frame_url: frameUrl,
                      timestamp: currentTime,
                      latitude: gpsCoord?.latitude,
                      longitude: gpsCoord?.longitude
                    });

                  if (frameError) {
                    console.error('Error saving frame metadata:', frameError);
                  }
                  
                  savedFrameUrls.push(frameUrl);
                  
                  // Move to next frame or finish
                  currentTime += frameInterval;
                  if (currentTime < videoDuration) {
                    video.currentTime = currentTime;
                  } else {
                    URL.revokeObjectURL(videoUrl);
                    console.log(`Extracted and saved ${savedFrameUrls.length} frames`);
                    resolve(savedFrameUrls);
                  }
                } catch (uploadError) {
                  console.error('Error saving frame:', uploadError);
                  reject(uploadError);
                }
              } else {
                reject(new Error('Failed to convert canvas to blob'));
              }
            }, 'image/jpeg', 0.95);
          } catch (error) {
            console.error('Error during frame extraction:', error);
            reject(error);
          }
        };
        
        // Start seeking to first frame
        video.currentTime = currentTime;
      };
      
      video.onerror = (e) => {
        console.error('Video error during frame extraction:', e);
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Error loading video for frame extraction'));
      };
    } catch (error) {
      console.error('Frame extraction failed:', error);
      reject(error);
    }
  });
};

// Define proper interface for crack detection result
export interface CrackDetectionResult {
  hasCrack: boolean;
  confidence?: number;
  predictions: Array<{
    bbox?: [number, number, number, number]; // [x1, y1, x2, y2]
    score?: number;
    class?: string;
  }>;
}

// Updated placeholder functions with proper return types for ModelTestPage
export const detectCracks = async (image: File): Promise<CrackDetectionResult> => {
  // This is a placeholder that will be implemented later
  // For now, return a mock result so the UI works
  console.log('Placeholder detectCracks called with image', image.name);
  return {
    hasCrack: false,
    confidence: 0,
    predictions: []
  };
};

export const drawBoundingBoxes = async (imageUrl: string, predictions: any[]): Promise<string> => {
  // This is a placeholder that will be implemented later
  // For now, return the original image URL
  console.log('Placeholder drawBoundingBoxes called with', predictions.length, 'predictions');
  return imageUrl;
};
