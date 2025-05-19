
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Info, Wifi, Lock, Globe } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CameraSelectProps {
  cameras: MediaDeviceInfo[];
  selectedCamera: string;
  setSelectedCamera: (camera: string) => void;
  disabled: boolean;
  ipCameraUrl?: string;
  setIpCameraUrl?: (url: string) => void;
  isIpCamera?: boolean;
  useProxy?: boolean;
  setUseProxy?: (use: boolean) => void;
}

const CameraSelect: React.FC<CameraSelectProps> = ({
  cameras,
  selectedCamera,
  setSelectedCamera,
  disabled,
  ipCameraUrl = '',
  setIpCameraUrl = () => {},
  isIpCamera = false,
  useProxy = false,
  setUseProxy = () => {}
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
              Include http:// or https://
            </span>
          </label>
          
          <div className="flex space-y-2 flex-col">
            <div className="flex items-center space-x-2 mb-2">
              <Switch 
                id="use-proxy"
                checked={useProxy} 
                onCheckedChange={setUseProxy}
                disabled={disabled}
              />
              <Label htmlFor="use-proxy" className="flex items-center">
                <Lock className="h-4 w-4 mr-1" />
                Use HTTPS Proxy
                <span className="ml-1 text-xs text-muted-foreground">(recommended)</span>
              </Label>
            </div>
            
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id="ip-camera-url"
                  type="url"
                  placeholder={useProxy ? "https://yourdomain.com/proxy/cam" : "http://192.168.1.x/stream"}
                  value={tempIpUrl}
                  onChange={(e) => {
                    setTempIpUrl(e.target.value);
                    setInputValid(true); // Reset validation on change
                  }}
                  disabled={disabled}
                  className={`${!inputValid ? "border-red-500" : ""} pl-8`}
                />
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  {useProxy ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                </div>
              </div>
              <Button 
                onClick={handleApplyIpUrl}
                disabled={disabled || !tempIpUrl}
                type="button"
              >
                Connect
              </Button>
            </div>
          </div>
          
          {!inputValid && (
            <p className="text-xs text-red-500">
              Please enter a valid URL (e.g., https://your-proxy.com/esp32cam or http://192.168.1.x/stream)
            </p>
          )}
          
          <Alert>
            <AlertDescription className="text-xs">
              <p className="font-medium">ESP32-CAM Connection Help:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>For secure connections, set up a reverse proxy with HTTPS support</li>
                <li>Direct camera connections only work on HTTP sites or localhost</li>
                <li>If using a proxy, enter the full HTTPS URL to your proxy endpoint</li>
                <li>If using direct connection, make sure your device is on the same network as the ESP32-CAM</li>
                <li>Typical ESP32-CAM URLs: http://192.168.x.x or http://192.168.x.x:81/stream</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default CameraSelect;
