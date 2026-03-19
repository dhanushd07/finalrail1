
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import VideoStatus from './VideoStatus';
import type { IpStreamStatus } from '@/hooks/useIpCamera';

interface RecordingControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  loading: boolean;
  selectedCamera: string;
  cameraPermission: boolean | null;
  cameraError: string | null;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  chunksRef: React.MutableRefObject<Blob[]>;
  startGpsTracking: () => boolean;
  startTimer: () => void;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  stopGpsTracking: () => void;
  stopTimer: () => void;
  uploadRecording: (
    chunks: Blob[],
    setLoading: (v: boolean) => void,
    setIsRecording: (v: boolean) => void,
    setRecordingTime: (v: number) => void,
    recordingDuration: number
  ) => Promise<void>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setRecordingTime: React.Dispatch<React.SetStateAction<number>>;
  getRecordingDuration: () => number;
  isIpCamera?: boolean;
  startIpRecording?: () => MediaRecorder | null;
  stopIpStream?: () => void;
  drawToCanvas?: () => void;
  ipStreamStatus?: IpStreamStatus;
  ipStreamUrl?: string;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  videoRef,
  isRecording,
  loading,
  selectedCamera,
  cameraPermission,
  cameraError,
  mediaRecorderRef,
  chunksRef,
  startGpsTracking,
  startTimer,
  setIsRecording,
  stopGpsTracking,
  stopTimer,
  uploadRecording,
  setLoading,
  setRecordingTime,
  getRecordingDuration,
  isIpCamera,
  startIpRecording,
  stopIpStream,
  drawToCanvas,
  ipStreamStatus,
  ipStreamUrl
}) => {
  const { toast } = useToast();

  const handleStartRecording = async () => {
    if (isIpCamera) {
      // Step 1: Validate URL
      if (!ipStreamUrl) {
        toast({
          title: 'IP Camera Error',
          description: 'No stream URL provided. Please enter a valid MJPEG stream URL.',
          variant: 'destructive',
        });
        console.error('[IP Camera] Recording aborted: no stream URL');
        return;
      }

      // Step 2: Validate URL format
      try {
        new URL(ipStreamUrl);
      } catch {
        toast({
          title: 'IP Camera Error',
          description: `Invalid URL format: "${ipStreamUrl}". Please enter a valid URL starting with http:// or https://`,
          variant: 'destructive',
        });
        console.error('[IP Camera] Recording aborted: invalid URL format');
        return;
      }

      // Step 3: Check stream connection
      if (ipStreamStatus !== 'connected') {
        toast({
          title: 'IP Camera Error',
          description: ipStreamStatus === 'loading'
            ? 'Stream is still connecting. Please wait until the stream is loaded.'
            : ipStreamStatus === 'error'
              ? 'Stream failed to connect. Check the URL and make sure the camera is online and accessible.'
              : 'Stream not ready. Please enter a valid URL and wait for connection.',
          variant: 'destructive',
        });
        console.error(`[IP Camera] Recording aborted: stream status is "${ipStreamStatus}"`);
        return;
      }

      // Step 4: Validate hook availability
      if (!startIpRecording) {
        toast({
          title: 'IP Camera Error',
          description: 'IP camera recording function not available. This is an internal error.',
          variant: 'destructive',
        });
        console.error('[IP Camera] Recording aborted: startIpRecording function is undefined');
        return;
      }

      // Step 5: Start canvas drawing
      console.log('[IP Camera] Step 5: Starting canvas frame drawing');
      drawToCanvas?.();

      // Step 6: Start GPS
      const gpsStarted = startGpsTracking();
      if (!gpsStarted) {
        console.warn('[IP Camera] GPS tracking could not be started, continuing without GPS');
        toast({
          title: 'GPS Warning',
          description: 'GPS tracking could not be started. Video will record without location data.',
          variant: 'default',
        });
      } else {
        console.log('[IP Camera] Step 6: GPS tracking started');
      }

      try {
        // Step 7: Create MediaRecorder from canvas stream
        console.log('[IP Camera] Step 7: Creating MediaRecorder from canvas.captureStream()');
        const recorder = startIpRecording();
        if (!recorder) {
          toast({
            title: 'IP Camera Recording Error',
            description: 'Failed to create video recorder from IP camera stream. Possible causes:\n• Canvas is tainted by CORS\n• Browser does not support canvas.captureStream()\n• No video tracks available',
            variant: 'destructive',
          });
          console.error('[IP Camera] Recording aborted: startIpRecording returned null');
          stopGpsTracking();
          return;
        }

        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
            console.log(`[IP Camera] Data chunk received: ${event.data.size} bytes (total chunks: ${chunksRef.current.length})`);
          } else {
            console.warn('[IP Camera] Received empty data chunk — canvas may not be drawing frames');
          }
        };

        recorder.onerror = (event) => {
          console.error('[IP Camera] MediaRecorder error during recording:', event);
          toast({
            title: 'IP Camera Recording Error',
            description: 'An error occurred during recording. The recording may be incomplete.',
            variant: 'destructive',
          });
        };

        recorder.onstop = async () => {
          console.log(`[IP Camera] Recording stopped. Total chunks: ${chunksRef.current.length}`);
          stopIpStream?.();
          const finalDuration = getRecordingDuration();
          console.log(`[IP Camera] Final duration: ${finalDuration} seconds`);

          if (chunksRef.current.length === 0) {
            toast({
              title: 'IP Camera Error',
              description: 'No video data was captured. The stream may have been disconnected during recording.',
              variant: 'destructive',
            });
            console.error('[IP Camera] Upload aborted: 0 chunks recorded');
            setIsRecording(false);
            setRecordingTime(0);
            stopGpsTracking();
            return;
          }

          console.log('[IP Camera] Starting upload...');
          await uploadRecording(
            chunksRef.current,
            setLoading,
            setIsRecording,
            setRecordingTime,
            finalDuration
          );
          chunksRef.current = [];
        };

        // Step 8: Start recording
        recorder.start(1000);
        setIsRecording(true);
        startTimer();
        console.log('[IP Camera] Step 8: Recording started successfully');

        toast({
          title: 'IP Camera Recording Started',
          description: gpsStarted
            ? 'Recording IP camera stream with GPS tracking active.'
            : 'Recording IP camera stream (no GPS data).',
        });
      } catch (err) {
        console.error('[IP Camera] Unexpected error starting recording:', err);
        toast({
          title: 'IP Camera Recording Error',
          description: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}. Check console for details.`,
          variant: 'destructive',
        });
        stopGpsTracking();
      }
      return;
    }

    // === Existing device camera flow (unchanged) ===
    if (!videoRef.current?.srcObject) {
      toast({
        title: 'Camera Error',
        description: 'Camera not initialized. Please select a camera and grant permission.',
        variant: 'destructive',
      });
      console.error('[Device Camera] Recording aborted: no srcObject on video element');
      return;
    }

    const gpsStarted = startGpsTracking();
    if (!gpsStarted) {
      console.warn('[Device Camera] GPS tracking could not be started, continuing without GPS');
      toast({
        title: 'GPS Warning',
        description: 'GPS tracking could not be started. Location data may be limited.',
        variant: 'default',
      });
    }

    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const options = { 
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 500000
      };
      
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        console.log(`[Device Camera] Using ${options.mimeType} at ${options.videoBitsPerSecond}bps`);
      } else {
        console.log(`[Device Camera] ${options.mimeType} not supported, using browser default`);
        mediaRecorderRef.current = new MediaRecorder(stream);
      }

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log(`[Device Camera] Data chunk: ${event.data.size} bytes`);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('[Device Camera] MediaRecorder error:', event);
        toast({
          title: 'Recording Error',
          description: 'An error occurred during recording.',
          variant: 'destructive',
        });
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log(`[Device Camera] Recording stopped with ${chunksRef.current.length} chunks`);
        const finalDuration = getRecordingDuration();
        console.log(`[Device Camera] Final duration: ${finalDuration} seconds`);
        
        await uploadRecording(
          chunksRef.current,
          setLoading,
          setIsRecording,
          setRecordingTime,
          finalDuration
        );
        chunksRef.current = [];
      };

      console.log('[Device Camera] Starting MediaRecorder');
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      startTimer();

      toast({
        title: 'Recording started',
        description: gpsStarted ? 'GPS tracking is active. Recording in progress.' : 'Recording in progress without GPS.',
      });
    } catch (err) {
      console.error('[Device Camera] Error starting recording:', err);
      toast({
        title: 'Recording Error',
        description: `Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
      stopGpsTracking();
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log(`[${isIpCamera ? 'IP Camera' : 'Device Camera'}] Stopping recording`);
      mediaRecorderRef.current.stop();
      stopTimer();
    } else {
      console.warn('Stop recording called but no active recorder found');
    }
  };

  // For IP camera, require a connected stream
  const ipReady = isIpCamera && !!ipStreamUrl && ipStreamStatus === 'connected';

  return (
    <VideoStatus
      isRecording={isRecording}
      loading={loading}
      selectedCamera={selectedCamera}
      cameraPermission={isIpCamera ? true : cameraPermission}
      error={isIpCamera ? (ipReady ? null : 'Stream not connected') : cameraError}
      startRecording={handleStartRecording}
      stopRecording={handleStopRecording}
    />
  );
};

export default RecordingControls;


