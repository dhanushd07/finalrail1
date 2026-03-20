
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
  ipStreamUrl?: string;
  ipImgRef?: React.RefObject<HTMLImageElement>;
  ipCanvasRef?: React.RefObject<HTMLCanvasElement>;
}

const VideoPreview: React.FC<VideoPreviewProps & { ipProxiedUrl?: string }> = ({
  videoRef,
  isRecording,
  recordingTime,
  gpsEnabled,
  gpsAccuracy,
  cameraPermission,
  isIpCamera,
  ipStreamUrl,
  ipImgRef,
  ipCanvasRef,
  ipProxiedUrl
}) => {
  // Use the proxied URL for the img src to bypass CORS
  const imgSrc = ipProxiedUrl || ipStreamUrl || '';

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
      {isIpCamera ? (
        <>
          <img
            ref={ipImgRef}
            src={imgSrc}
            alt="IP Camera Stream"
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
          />
          <canvas ref={ipCanvasRef} className="hidden" />
        </>
      ) : cameraPermission === false ? (
        <CameraPlaceholder />
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

