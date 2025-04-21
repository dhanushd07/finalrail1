
import { supabase } from '@/integrations/supabase/client';
import type { VideoRecord } from '@/types';
import { parseGPSLog, matchFrameToGPS } from './videoProcessing';

/**
 * Upload a file to Supabase storage
 * @param bucket Storage bucket name
 * @param path File path including name
 * @param file File to upload
 */
export const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
    
    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
    
    // Get public URL immediately after successful upload
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error in uploadFile to ${bucket}/${path}:`, error);
    throw error;
  }
};

/**
 * Create a video record in the database
 * @param videoData Video record data
 */
export const createVideoRecord = async (videoData: {
  user_id: string;
  video_url: string;
  gps_log_url: string;
  status: string;
}): Promise<void> => {
  try {
    const { error } = await supabase
      .from('videos')
      .insert(videoData);
    
    if (error) {
      console.error('Error creating video record:', error);
      throw error;
    }
    
    console.log('Video record created successfully');
  } catch (error) {
    console.error('Error in createVideoRecord:', error);
    throw error;
  }
};

/**
 * Get video records by user ID and status
 * @param userId User ID
 * @param status Video status (optional)
 */
export const getVideoRecords = async (userId: string, status?: string): Promise<VideoRecord[]> => {
  let query = supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching video records:', error);
    throw error;
  }
  
  return data as VideoRecord[];
};

/**
 * Update video status in the database
 * @param videoId Video ID
 * @param status New status
 */
export const updateVideoStatus = async (videoId: string, status: string): Promise<void> => {
  const { error } = await supabase
    .from('videos')
    .update({ status })
    .eq('id', videoId);
  
  if (error) {
    console.error('Error updating video status:', error);
    throw error;
  }
};

/**
 * Get a video record by ID
 * @param videoId Video ID
 */
export const getVideoById = async (videoId: string): Promise<VideoRecord | null> => {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();
  
  if (error) {
    console.error('Error fetching video by ID:', error);
    return null;
  }
  
  return data as VideoRecord;
};

/**
 * Get detection data for a video
 * @param videoId Video ID
 */
export const getDetectionData = async (videoId: string) => {
  const { data, error } = await supabase
    .from('crack_data')
    .select('*')
    .eq('video_id', videoId)
    .order('timestamp', { ascending: true });
  
  if (error) {
    console.error('Error fetching detection data:', error);
    throw error;
  }
  
  return data;
};

/**
 * Save detection data to the database
 * @param detectionData Detection data
 */
export const saveDetectionData = async (detectionData: {
  user_id: string;
  video_id: string;
  image_url: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  detection_json?: any;
  has_crack: boolean;
}) => {
  const { error } = await supabase
    .from('crack_data')
    .insert(detectionData);
  
  if (error) {
    console.error('Error saving detection data:', error);
    throw error;
  }
};

/**
 * Get public URL for a file in storage
 * @param bucket Storage bucket name
 * @param path File path
 */
export const getPublicUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Delete a video record and its files in Supabase Storage.
 * @param videoId Video ID
 * @param videoUrl URL to the video file in Supabase Storage
 * @param gpsLogUrl URL to the gps log file in Supabase Storage
 */
export const deleteVideoRecord = async (
  videoId: string,
  videoUrl: string,
  gpsLogUrl: string
): Promise<void> => {
  try {
    console.log('Deleting video record:', videoId);
    
    // Extract file paths from URLs
    const extractPath = (url: string) => {
      // e.g., https://xyz.supabase.co/storage/v1/object/public/videos/somefile.mp4
      // Path: after "/videos/"
      const arr = url.split('/videos/');
      if (arr.length < 2) return null;
      return arr[1];
    };
    
    const videoPath = extractPath(videoUrl);
    const gpsPath = extractPath(gpsLogUrl);
    
    console.log('Paths to delete:', { videoPath, gpsPath });
    
    // Delete files from storage first
    if (videoPath) {
      const { error: videoDeleteError } = await supabase.storage.from('videos').remove([videoPath]);
      if (videoDeleteError) {
        console.warn('Could not delete video file:', videoDeleteError);
      }
    }
    
    if (gpsPath) {
      const { error: gpsDeleteError } = await supabase.storage.from('videos').remove([gpsPath]);
      if (gpsDeleteError) {
        console.warn('Could not delete GPS log file:', gpsDeleteError);
      }
    }
    
    // Also delete any associated crack_data records
    const { error: crackDeleteError } = await supabase
      .from('crack_data')
      .delete()
      .eq('video_id', videoId);
    
    if (crackDeleteError) {
      console.warn('Could not delete associated crack data:', crackDeleteError);
    }
    
    // Remove DB row
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (error) {
      console.error('Error deleting video record from database:', error);
      throw error;
    }
    
    console.log('Video record deleted successfully');
  } catch (error) {
    console.error(`Error in deleteVideoRecord for videoId ${videoId}:`, error);
    throw error;
  }
};

/**
 * Download a file from Supabase storage
 * @param bucket Storage bucket name
 * @param path File path
 */
export const downloadFile = async (bucket: string, path: string): Promise<Blob> => {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  
  if (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
  
  return data;
};

/**
 * Process a video and save detection results
 * @param videoId Video ID
 * @param userId User ID
 */
export const processVideoFrames = async (videoId: string, userId: string): Promise<boolean> => {
  try {
    // 1. Get the video record
    const video = await getVideoById(videoId);
    if (!video) {
      console.error('Video not found');
      return false;
    }
    
    // 2. Download GPS log file
    const gpsLogPath = video.gps_log_url.split('/videos/')[1];
    if (!gpsLogPath) {
      console.error('Invalid GPS log URL');
      return false;
    }
    
    const gpsLogBlob = await downloadFile('videos', gpsLogPath);
    const gpsLogText = await gpsLogBlob.text();
    const gpsCoordinates = parseGPSLog(gpsLogText);
    
    if (gpsCoordinates.length === 0) {
      console.error('No GPS coordinates found');
      return false;
    }
    
    // 3. For demonstration purposes, we'll simulate processing by creating mock data
    // In a real implementation, we would extract frames from the video and process them
    
    for (let second = 0; second < 10; second++) {
      // Get GPS coordinate for this second
      const gpsCoord = matchFrameToGPS(second, gpsCoordinates);
      
      if (gpsCoord) {
        // Simulate crack detection result (alternate between crack detected and not detected)
        const hasCrack = second % 3 === 0;
        
        // Create a timestamp for this detection (for database compatibility)
        const timestamp = new Date();
        timestamp.setSeconds(timestamp.getSeconds() + second);
        
        // Save the detection data
        await saveDetectionData({
          user_id: userId,
          video_id: videoId,
          image_url: `https://placeholder.example.com/frame_${second.toString().padStart(2, '0')}.jpg`,
          timestamp: timestamp.toISOString(),
          latitude: gpsCoord.latitude,
          longitude: gpsCoord.longitude,
          detection_json: hasCrack ? { predictions: [{ class: 'crack', confidence: 0.95 }] } : null,
          has_crack: hasCrack
        });
      }
    }
    
    // 4. Update video status to "Completed"
    await updateVideoStatus(videoId, 'Completed');
    
    return true;
  } catch (error) {
    console.error('Error processing video frames:', error);
    return false;
  }
};
