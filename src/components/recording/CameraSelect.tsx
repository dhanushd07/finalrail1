
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CameraSelectProps {
  cameras: MediaDeviceInfo[];
  selectedCamera: string;
  setSelectedCamera: (camera: string) => void;
  disabled: boolean;
  ipCameraUrl?: string;
  setIpCameraUrl?: (url: string) => void;
  isIpCamera?: boolean;
}

const CameraSelect: React.FC<CameraSelectProps> = ({
  cameras,
  selectedCamera,
  setSelectedCamera,
  disabled,
  ipCameraUrl = '',
  setIpCameraUrl = () => {},
  isIpCamera = false
}) => {
  const [tempIpUrl, setTempIpUrl] = useState(ipCameraUrl);

  // Apply IP camera URL when button is clicked
  const handleApplyIpUrl = () => {
    if (tempIpUrl) {
      setIpCameraUrl(tempIpUrl);
    }
  };

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
          <SelectItem value="ip-camera">
            IP Camera (ESP32)
          </SelectItem>
        </SelectContent>
      </Select>

      {isIpCamera && (
        <div className="flex flex-col space-y-2 mt-2">
          <label htmlFor="ip-camera-url" className="text-sm font-medium">
            IP Camera URL
          </label>
          <div className="flex space-x-2">
            <Input
              id="ip-camera-url"
              type="url"
              placeholder="http://192.168.179.180/"
              value={tempIpUrl}
              onChange={(e) => setTempIpUrl(e.target.value)}
              disabled={disabled}
            />
            <Button 
              onClick={handleApplyIpUrl}
              disabled={disabled || !tempIpUrl}
              type="button"
            >
              Apply
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the URL of your ESP32-CAM stream (e.g., http://192.168.179.180/)
          </p>
        </div>
      )}
    </div>
  );
};

export default CameraSelect;
