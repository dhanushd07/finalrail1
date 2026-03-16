
import React from 'react';
import CameraPlaceholder from './CameraPlaceholder';
import RecordingTimer from './RecordingTimer';
import GpsStatus from './GpsStatus';
import { Wifi } from 'lucide-react';

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  recordingTime: number;
  gpsEnabled: boolean;
  gpsAccuracy: number | null;
  cameraPermission: boolean | null;
  isIpCamera?: boolean;
  ipStreamUrl?: string;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoRef,
  isRecording,
  recordingTime,
  gpsEnabled,
  gpsAccuracy,
  cameraPermission,
  isIpCamera = false,
  ipStreamUrl = '',
}) => {
  const showPlaceholder = !isIpCamera && cameraPermission === false;
  const showIpPlaceholder = isIpCamera && !ipStreamUrl;

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
      {showPlaceholder ? (
        <CameraPlaceholder />
      ) : showIpPlaceholder ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Wifi className="h-10 w-10 opacity-50" />
          <p className="text-sm">Enter a stream URL above to preview</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          crossOrigin={isIpCamera ? 'anonymous' : undefined}
          className="w-full h-full object-cover"
        />
      )}
      
      <RecordingTimer 
        isRecording={isRecording} 
        recordingTime={recordingTime} 
      />
      
      <GpsStatus
        gpsEnabled={gpsEnabled}
        gpsAccuracy={gpsAccuracy}
      />
    </div>
  );
};

export default VideoPreview;
