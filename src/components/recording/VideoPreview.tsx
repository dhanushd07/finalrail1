
import React from 'react';
import { CameraOff } from 'lucide-react';

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  recordingTime: number;
  gpsEnabled: boolean;
  gpsAccuracy: number | null;
  cameraPermission: boolean | null;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoRef,
  isRecording,
  recordingTime,
  gpsEnabled,
  gpsAccuracy,
  cameraPermission
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
      {cameraPermission === false ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900">
          <CameraOff className="h-12 w-12 mb-2 opacity-60" />
          <p className="text-center px-4">
            Camera access denied. Please check your browser permissions and refresh the page.
          </p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      )}
      
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1 rounded-full">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span>{formatTime(recordingTime)}</span>
        </div>
      )}
      
      {gpsEnabled && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1 rounded-full">
          <span className="text-xs">
            GPS: {gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)}m` : 'Connecting...'}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
