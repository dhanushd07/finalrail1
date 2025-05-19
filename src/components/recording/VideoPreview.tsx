
import React, { useEffect } from 'react';
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
  // Setup event handlers for the video element
  useEffect(() => {
    if (videoRef.current && isIpCamera) {
      const video = videoRef.current;
      
      // Add play error handler
      const onPlayError = () => {
        console.error("Error playing ESP32-CAM stream");
      };
      
      // Add play success handler
      const onCanPlay = () => {
        console.log("ESP32-CAM stream ready to play");
        video.play().catch(onPlayError);
      };
      
      // Add event listeners
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onPlayError);
      
      // Clean up event listeners
      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onPlayError);
      };
    }
  }, [videoRef, isIpCamera]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
      {cameraPermission === false && !isIpCamera ? (
        <CameraPlaceholder />
      ) : isIpCamera ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            controls
          />
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 text-xs rounded">
            ESP32-CAM Stream
          </div>
        </>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
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
