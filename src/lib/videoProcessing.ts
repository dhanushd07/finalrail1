
import { supabase } from '@/integrations/supabase/client';
import { GPSCoordinate } from '@/types';
import { uploadFile, getPublicUrl } from '@/lib/supabase';
import { matchFrameToGPS } from './videoProcessing';

// Updated function to extract and save frames directly during upload
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
                  
                  // Optional: Save frame metadata to database if needed
                  // You might want to create a new function in supabase.ts to save frame details
                  
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

