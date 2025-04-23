
import { useToast } from '@/hooks/use-toast';
import { uploadFile, createVideoRecord } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { GPSCoordinate } from '@/types';
import { MutableRefObject } from 'react';

interface UseVideoUploadParams {
  user: SupabaseUser | null;
  gpsLogRef: MutableRefObject<GPSCoordinate[]>;
  stopGpsTracking: () => void;
  toast: ReturnType<typeof useToast>['toast'];
}

export function useVideoUpload({ user, gpsLogRef, stopGpsTracking, toast }: UseVideoUploadParams) {
  const uploadRecording = async (
    chunks: Blob[],
    setLoading: (v: boolean) => void,
    setIsRecording: (v: boolean) => void,
    setRecordingTime: (v: number) => void
  ) => {
    try {
      setLoading(true);

      const videoBlob = new Blob(chunks, { type: 'video/webm' });

      if (videoBlob.size > 50 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Video size exceeds 50MB limit. Please record a shorter video.',
          variant: 'destructive',
        });
        return;
      }

      if (!user) throw new Error('User not authenticated');
      const gpsLogHeader = 'second,latitude,longitude,accuracy';
      const gpsLogRows = gpsLogRef.current.map(coord =>
        `${coord.second},${coord.latitude},${coord.longitude},${coord.accuracy || 0}`
      );
      const gpsLogContent = [gpsLogHeader, ...gpsLogRows].join('\n');
      const gpsLogBlob = new Blob([gpsLogContent], { type: 'text/csv' });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const videoFileName = `${user.id}/${timestamp}/video.webm`;
      const gpsLogFileName = `${user.id}/${timestamp}/gps_by_second.csv`;

      const videoFile = new File([videoBlob], 'video.webm');
      const gpsLogFile = new File([gpsLogBlob], 'gps_by_second.csv');

      const videoUrl = await uploadFile('videos', videoFileName, videoFile);
      const gpsLogUrl = await uploadFile('gps-logs', gpsLogFileName, gpsLogFile);

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
