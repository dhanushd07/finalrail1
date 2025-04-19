
export interface User {
  id: string;
  email: string;
}

export interface VideoRecord {
  id: string;
  user_id: string;
  video_url: string;
  gps_log_url: string;
  created_at: string;
  status: "Queued" | "Completed";
}

export interface CrackDetection {
  id: string;
  user_id: string;
  image_url: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  detection_json: any;
  confidence?: number;
  has_crack: boolean;
}

export interface GPSCoordinate {
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface RoboflowResponse {
  time: number;
  image: {
    width: number;
    height: number;
  };
  predictions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
  }>;
}
