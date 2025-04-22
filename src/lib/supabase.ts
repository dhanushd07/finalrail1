
import { supabase } from '@/integrations/supabase/client';
import type { VideoRecord } from '@/types';

/**
 * Upload a file to Supabase storage
 * @param bucket Storage bucket name
 * @param path File path including name
 * @param file File to upload
 */
export const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
  try {
    console.log(`Uploading file to ${bucket}/${path}`);
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
    console.log(`File uploaded successfully, public URL: ${urlData.publicUrl}`);
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
    console.log('Creating video record with data:', videoData);
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
  try {
    console.log(`Getting video records for user ${userId}${status ? ` with status: ${status}` : ''}`);
    
    let query = supabase
      .from('videos')
      .select('*')
      .eq('user_id', userId);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching video records:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} video records`);
    return data as VideoRecord[] || [];
  } catch (error) {
    console.error('Error in getVideoRecords:', error);
    return [];
  }
};

/**
 * Update video status in the database
 * @param videoId Video ID
 * @param status New status
 */
export const updateVideoStatus = async (videoId: string, status: string): Promise<void> => {
  try {
    console.log(`Updating video ${videoId} status to ${status}`);
    const { error } = await supabase
      .from('videos')
      .update({ status })
      .eq('id', videoId);
    
    if (error) {
      console.error('Error updating video status:', error);
      throw error;
    }
    
    console.log('Video status updated successfully');
  } catch (error) {
    console.error('Error in updateVideoStatus:', error);
    throw error;
  }
};

/**
 * Get a video record by ID
 * @param videoId Video ID
 */
export const getVideoById = async (videoId: string): Promise<VideoRecord | null> => {
  try {
    console.log(`Getting video with ID ${videoId}`);
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();
    
    if (error) {
      console.error('Error fetching video by ID:', error);
      return null;
    }
    
    console.log('Retrieved video record:', data);
    return data as VideoRecord;
  } catch (error) {
    console.error('Error in getVideoById:', error);
    return null;
  }
};

/**
 * Get detection data for a video
 * @param videoId Video ID
 */
export const getDetectionData = async (videoId: string) => {
  try {
    console.log(`Getting detection data for video ${videoId}`);
    const { data, error } = await supabase
      .from('crack_data')
      .select('*')
      .eq('video_id', videoId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      console.error('Error fetching detection data:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} detection records`);
    return data;
  } catch (error) {
    console.error('Error in getDetectionData:', error);
    return [];
  }
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
  try {
    console.log('Saving detection data:', detectionData);
    const { error } = await supabase
      .from('crack_data')
      .insert(detectionData);
    
    if (error) {
      console.error('Error saving detection data:', error);
      throw error;
    }
    
    console.log('Detection data saved successfully');
  } catch (error) {
    console.error('Error in saveDetectionData:', error);
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
      // Path: after "/videos/" or "/gps-logs/"
      try {
        const bucketRegex = /\/public\/([^\/]+)\/(.+)$/;
        const match = url.match(bucketRegex);
        if (match && match.length >= 3) {
          const bucket = match[1];
          const path = match[2];
          return { bucket, path };
        }
        return null;
      } catch (error) {
        console.error('Failed to extract path from URL:', url, error);
        return null;
      }
    };
    
    const videoPathInfo = extractPath(videoUrl);
    const gpsPathInfo = extractPath(gpsLogUrl);
    
    console.log('Extracted path info:', { videoPathInfo, gpsPathInfo });
    
    // Delete files from storage first
    if (videoPathInfo) {
      const { error: videoDeleteError } = await supabase.storage
        .from(videoPathInfo.bucket)
        .remove([videoPathInfo.path]);
        
      if (videoDeleteError) {
        console.warn('Could not delete video file:', videoDeleteError);
      } else {
        console.log('Video file deleted successfully');
      }
    }
    
    if (gpsPathInfo) {
      const { error: gpsDeleteError } = await supabase.storage
        .from(gpsPathInfo.bucket)
        .remove([gpsPathInfo.path]);
        
      if (gpsDeleteError) {
        console.warn('Could not delete GPS log file:', gpsDeleteError);
      } else {
        console.log('GPS log file deleted successfully');
      }
    }
    
    // Remove DB row
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (error) {
      console.error('Error deleting video record from database:', error);
      throw error;
    }
    
    console.log('Video record deleted successfully from database');
  } catch (error) {
    console.error(`Error in deleteVideoRecord for videoId ${videoId}:`, error);
    throw error;
  }
};
