
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const IP_CAMERA_ID = '__ip_camera__';

interface CameraSelectProps {
  cameras: MediaDeviceInfo[];
  selectedCamera: string;
  setSelectedCamera: (camera: string) => void;
  disabled: boolean;
  ipStreamUrl?: string;
  onIpStreamUrlChange?: (url: string) => void;
  ipStreamStatus?: 'idle' | 'loading' | 'connected' | 'error';
  ipStreamError?: string | null;
}

const CameraSelect: React.FC<CameraSelectProps> = ({
  cameras,
  selectedCamera,
  setSelectedCamera,
  disabled,
  ipStreamUrl,
  onIpStreamUrlChange,
  ipStreamStatus = 'idle',
  ipStreamError
}) => {
  const isIpCamera = selectedCamera === IP_CAMERA_ID;

  return (
    <div className="flex flex-col space-y-2">
      <label htmlFor="camera-select" className="text-sm font-medium">
        Select Camera
      </label>
      <Select
        value={selectedCamera}
        onValueChange={setSelectedCamera}
        disabled={disabled}
      >
        <SelectTrigger id="camera-select" className="w-full">
          <SelectValue placeholder="Select a camera" />
        </SelectTrigger>
        <SelectContent>
          {cameras.map((camera) => (
            <SelectItem 
              key={camera.deviceId} 
              value={camera.deviceId || `camera-${cameras.indexOf(camera)}`}
            >
              {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
            </SelectItem>
          ))}
          <SelectItem value={IP_CAMERA_ID}>IP Camera</SelectItem>
        </SelectContent>
      </Select>

      {isIpCamera && (
        <div className="flex flex-col space-y-2">
          <label htmlFor="ip-url" className="text-xs text-muted-foreground">
            Enter IP Stream URL (MJPEG)
          </label>
          <Input
            id="ip-url"
            value={ipStreamUrl ?? ''}
            onChange={(e) => onIpStreamUrlChange?.(e.target.value)}
            placeholder="https://your-camera-address/stream"
            disabled={disabled}
          />
          {ipStreamStatus === 'loading' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Connecting to IP camera stream...
            </div>
          )}
          {ipStreamStatus === 'connected' && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Stream connected successfully
            </div>
          )}
          {ipStreamStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {ipStreamError || 'Failed to connect to IP camera stream'}
            </div>
          )}
          {!ipStreamUrl && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Please enter a valid stream URL to continue
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CameraSelect;


