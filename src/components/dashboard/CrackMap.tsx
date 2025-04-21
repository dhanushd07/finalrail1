
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface CrackMapProps {
  detections: any[];
}

const CrackMap: React.FC<CrackMapProps> = ({ detections }) => {
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  
  useEffect(() => {
    // Set map center based on detections or default to a location
    if (detections.length > 0) {
      const validDetections = detections.filter(d => d.latitude && d.longitude);
      if (validDetections.length > 0) {
        setCenter([validDetections[0].latitude, validDetections[0].longitude]);
      }
    }
  }, [detections]);
  
  // No detections with valid coordinates
  if (detections.filter(d => d.latitude && d.longitude).length === 0) {
    return (
      <div className="flex items-center justify-center h-full border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No location data available for cracks</p>
      </div>
    );
  }

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {detections.map((detection, idx) => (
        detection.latitude && detection.longitude ? (
          <Marker 
            key={detection.id || idx}
            position={[detection.latitude, detection.longitude]}
          >
            <Popup>
              <div className="p-1">
                <p className="font-medium">Crack Detected</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(detection.timestamp).toLocaleString()}
                </p>
                {detection.image_url && (
                  <img 
                    src={detection.image_url} 
                    alt="Frame with crack" 
                    className="mt-2 max-w-48 max-h-32 object-cover rounded border"
                  />
                )}
              </div>
            </Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  );
};

export default CrackMap;
