
import React, { useRef, useEffect, useState } from 'react';
import CameraPlaceholder from './CameraPlaceholder';
import RecordingTimer from './RecordingTimer';
import GpsStatus from './GpsStatus';
import { Wifi, AlertCircle } from 'lucide-react';

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  imgRef?: React.RefObject<HTMLImageElement>;
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
  imgRef,
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
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset error/loaded state when URL changes
  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [ipStreamUrl]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
      {showPlaceholder ? (
        <CameraPlaceholder />
      ) : showIpPlaceholder ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Wifi className="h-10 w-10 opacity-50" />
          <p className="text-sm">Enter a stream URL above to preview</p>
        </div>
      ) : isIpCamera && ipStreamUrl ? (
        <>
          {/* MJPEG streams work natively in <img> tags */}
          <img
            ref={imgRef}
            src={ipStreamUrl}
            alt="IP Camera Stream"
            crossOrigin="anonymous"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
          {imgError && !imgLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2 bg-black/80">
              <AlertCircle className="h-8 w-8 opacity-70" />
              <p className="text-sm text-center px-4">
                Could not load stream. The stream may need CORS headers or an HTTPS proxy.
              </p>
            </div>
          )}
          {/* Hidden video element kept for compatibility */}
          <video ref={videoRef} className="hidden" muted playsInline />
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
