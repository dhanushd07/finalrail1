
import { useToast } from '@/hooks/use-toast';
import { uploadFile, createVideoRecord } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { GPSCoordinate } from '@/types';
import { MutableRefObject } from 'react';

interface UseVideoUploadParams {
  user: SupabaseUser | null;
  gpsLogRef: MutableRefObject<GPSCoordinate[]>;
  stopGpsTracking: () => void;
  generateGpsLogContent: (videoDuration?: number) => string;
}

export function useVideoUpload({ 
  user, 
  gpsLogRef, 
  stopGpsTracking, 
  generateGpsLogContent 
}: UseVideoUploadParams) {
  const { toast } = useToast();

  const uploadRecording = async (
    chunks: Blob[],
    setLoading: (v: boolean) => void,
    setIsRecording: (v: boolean) => void,
    setRecordingTime: (v: number) => void,
    videoDuration?: number
  ) => {
    try {
      setLoading(true);

      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      console.log(`Video recording completed: ${videoBlob.size} bytes`);

      if (videoBlob.size === 0) {
        toast({
          title: 'Error',
          description: 'Video recording is empty. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (videoBlob.size > 50 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Video size exceeds 50MB limit. Please record a shorter video.',
          variant: 'destructive',
        });
        return;
      }

      if (!user) throw new Error('User not authenticated');
      
      // Generate GPS log content from the collected coordinates
      // Pass the video duration to ensure we generate coordinates for each second
      console.log(`Processing ${gpsLogRef.current.length} GPS coordinates`);
      console.log(`Video duration for GPS log: ${videoDuration || 'unknown'} seconds`);
      const gpsLogContent = generateGpsLogContent(videoDuration);
      console.log(`GPS log content length: ${gpsLogContent.length} characters`);
      
      const gpsLogBlob = new Blob([gpsLogContent], { type: 'text/csv' });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const videoFileName = `${user.id}/${timestamp}/video.webm`;
      const gpsLogFileName = `${user.id}/${timestamp}/gps_by_second.csv`;

      const videoFile = new File([videoBlob], 'video.webm');
      const gpsLogFile = new File([gpsLogBlob], 'gps_by_second.csv');
      
      console.log('Uploading video file:', videoFileName);
      const videoUrl = await uploadFile('videos', videoFileName, videoFile);
      console.log('Video uploaded successfully');
      
      console.log('Uploading GPS log file:', gpsLogFileName);
      const gpsLogUrl = await uploadFile('gps-logs', gpsLogFileName, gpsLogFile);
      console.log('GPS log uploaded successfully');

      console.log('Creating video record in database');
      await createVideoRecord({
        user_id: user.id,
        video_url: videoFileName,
        gps_log_url: gpsLogFileName,
        status: 'Queued'
      });

      toast({
        title: 'Recording saved',
        description: 'Your video has been uploaded and queued for processing.',
      });
    } catch (err) {
      console.error('Error saving recording:', err);
      toast({
        title: 'Recording Error',
        description: 'Failed to save your recording. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRecording(false);
      setRecordingTime(0);
      stopGpsTracking();
      setLoading(false);
    }
  };

  return { uploadRecording };
}
