
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export const IP_CAMERA_ID = '__ip_camera__';
const DEFAULT_IP_URL = 'https://ability-expressed-artwork-sanyo.trycloudflare.com/stream';

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
  ipStreamUrl,
  onIpStreamUrlChange
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
        <div className="flex flex-col space-y-1">
          <label htmlFor="ip-url" className="text-xs text-muted-foreground">
            IP Stream URL (MJPEG)
          </label>
          <Input
            id="ip-url"
            value={ipStreamUrl ?? DEFAULT_IP_URL}
            onChange={(e) => onIpStreamUrlChange?.(e.target.value)}
            placeholder="http://192.168.1.100/stream"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

export { DEFAULT_IP_URL };
export default CameraSelect;

