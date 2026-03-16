
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Wifi } from 'lucide-react';

const IP_CAMERA_VALUE = '__ip_camera__';

interface CameraSelectProps {
  cameras: MediaDeviceInfo[];
  selectedCamera: string;
  setSelectedCamera: (camera: string) => void;
  disabled: boolean;
  ipStreamUrl?: string;
  onIpStreamUrlChange?: (url: string) => void;
}

const CameraSelect: React.FC<CameraSelectProps> = ({
  cameras,
  selectedCamera,
  setSelectedCamera,
  disabled,
  ipStreamUrl = '',
  onIpStreamUrlChange,
}) => {
  const isIpCamera = selectedCamera === IP_CAMERA_VALUE;

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
          <SelectItem value={IP_CAMERA_VALUE}>
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5" />
              IP Camera (ESP32-CAM)
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {isIpCamera && (
        <div className="flex flex-col space-y-1.5 pt-1">
          <label htmlFor="ip-stream-url" className="text-xs font-medium text-muted-foreground">
            Stream URL (HTTPS ngrok or proxy)
          </label>
          <Input
            id="ip-stream-url"
            type="url"
            placeholder="https://xxxx.ngrok-free.app/stream"
            value={ipStreamUrl}
            onChange={(e) => onIpStreamUrlChange?.(e.target.value)}
            disabled={disabled}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use an HTTPS tunnel (e.g. ngrok) to proxy your ESP32-CAM stream.
          </p>
        </div>
      )}
    </div>
  );
};

export { IP_CAMERA_VALUE };
export default CameraSelect;
