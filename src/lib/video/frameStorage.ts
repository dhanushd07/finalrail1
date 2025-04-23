
import { supabase } from '@/integrations/supabase/client';
import { GPSCoordinate, VideoFrame } from '@/types';

export const saveVideoFrames = async (
  videoId: string, 
  userId: string, 
  frames: VideoFrame[]
): Promise<string[]> => {
  try {
    const frameUrls: string[] = [];

    for (const frame of frames) {
      const fileName = `${userId}/${videoId}/frame_${frame.index}.jpg`;
      
      // Convert blob to file
      const frameFile = new File([frame.blob], `frame_${frame.index}.jpg`, { type: 'image/jpeg' });
      
      // Upload frame to Supabase storage
      const { data, error } = await supabase.storage
        .from('frames')
        .upload(fileName, frameFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Error uploading frame:', error);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('frames').getPublicUrl(fileName);
      
      // Store frame metadata in database
      const insertData = {
        video_id: videoId,
        user_id: userId,
        frame_url: urlData.publicUrl,
        timestamp: frame.timestamp,
        latitude: frame.gpsCoordinate?.latitude,
        longitude: frame.gpsCoordinate?.longitude
      };

      const { error: dbError } = await supabase
        .from('video_frames')
        .insert(insertData);

      if (dbError) {
        console.error('Error storing frame metadata:', dbError);
      }

      frameUrls.push(urlData.publicUrl);
    }

    return frameUrls;
  } catch (error) {
    console.error('Error in saveVideoFrames:', error);
    return [];
  }
};
