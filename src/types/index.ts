
export interface AppUser {
  id: string;
  email: string;
}

export interface VideoRecord {
  id: string;
  user_id: string;
  video_url: string;
  gps_log_url: string;
  status: string;
  created_at: string;
}

export interface GPSCoordinate {
  second: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string; // Keep for backward compatibility
}

export interface VideoFrame {
  blob: Blob;
  index: number;
  timestamp: number;
  gpsCoordinate?: GPSCoordinate;
}
