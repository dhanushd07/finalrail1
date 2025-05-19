
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Info, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [inputValid, setInputValid] = useState(true);

  useEffect(() => {
    // Update tempUrl when ipCameraUrl changes from outside
    setTempIpUrl(ipCameraUrl);
  }, [ipCameraUrl]);

  const validateUrl = (url: string) => {
    if (!url) return false;
    
    try {
      // Attempt to create URL object to validate basic format
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Apply IP camera URL when button is clicked
  const handleApplyIpUrl = () => {
    if (tempIpUrl) {
      const isValid = validateUrl(tempIpUrl);
      setInputValid(isValid);
      
      if (isValid) {
        setIpCameraUrl(tempIpUrl);
      }
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
            <div className="flex items-center">
              <Wifi className="mr-2 h-4 w-4" />
              IP Camera (ESP32-CAM)
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {isIpCamera && (
        <div className="flex flex-col space-y-2 mt-2">
          <label htmlFor="ip-camera-url" className="text-sm font-medium flex items-center">
            ESP32-CAM URL
            <span className="ml-1 text-xs text-muted-foreground inline-flex items-center">
              <Info className="h-3 w-3 mr-1" />
              Include http://
            </span>
          </label>
          <div className="flex space-x-2">
            <Input
              id="ip-camera-url"
              type="url"
              placeholder="http://192.168.1.x/"
              value={tempIpUrl}
              onChange={(e) => {
                setTempIpUrl(e.target.value);
                setInputValid(true); // Reset validation on change
              }}
              disabled={disabled}
              className={!inputValid ? "border-red-500" : ""}
            />
            <Button 
              onClick={handleApplyIpUrl}
              disabled={disabled || !tempIpUrl}
              type="button"
            >
              Connect
            </Button>
          </div>
          {!inputValid && (
            <p className="text-xs text-red-500">
              Please enter a valid URL (e.g., http://192.168.179.180)
            </p>
          )}
          
          <Alert>
            <AlertDescription className="text-xs">
              <p className="font-medium">ESP32-CAM Connection Help:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Make sure your ESP32-CAM is properly powered</li>
                <li>Ensure your device is on the same network as the ESP32-CAM</li>
                <li>The default ESP32-CAM URL is usually: http://192.168.x.x</li>
                <li>Some ESP32-CAMs use port 81 (e.g., http://192.168.x.x:81)</li>
                <li>Try both /stream and /video endpoints if one doesn't work</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default CameraSelect;
