export interface User {
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
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}
