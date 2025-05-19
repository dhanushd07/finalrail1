
import React from 'react';
import CameraPlaceholder from './CameraPlaceholder';
import RecordingTimer from './RecordingTimer';
import GpsStatus from './GpsStatus';

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  recordingTime: number;
  gpsEnabled: boolean;
  gpsAccuracy: number | null;
  cameraPermission: boolean | null;
  isIpCamera?: boolean;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoRef,
  isRecording,
  recordingTime,
  gpsEnabled,
  gpsAccuracy,
  cameraPermission,
  isIpCamera = false
}) => {
  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
      {cameraPermission === false && !isIpCamera ? (
        <CameraPlaceholder />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          controls={isIpCamera} // Add controls for IP camera streams
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
