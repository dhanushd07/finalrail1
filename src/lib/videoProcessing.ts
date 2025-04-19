
import { GPSCoordinate } from '@/types';

// Function to extract frames from a video
export const extractFrames = async (videoBlob: Blob, fps: number = 1): Promise<Blob[]> => {
  // This is a client-side placeholder for frame extraction
  // In a real app, this would be done in a backend service using ffmpeg
  // For now, we'll simulate this process for demo purposes
  
  console.log('Extracting frames from video at', fps, 'fps');
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      // Return mock frame blobs
      resolve([
        new Blob(['frame1'], { type: 'image/jpeg' }),
        new Blob(['frame2'], { type: 'image/jpeg' }),
        new Blob(['frame3'], { type: 'image/jpeg' }),
      ]);
    }, 2000);
  });
};

// Function to send an image to the Roboflow API for crack detection
export const detectCracks = async (imageBlob: Blob): Promise<{
  hasCrack: boolean;
  predictions: any[];
  confidence?: number;
}> => {
  try {
    const formData = new FormData();
    formData.append('file', imageBlob);
    
    const response = await fetch(
      'https://detect.roboflow.com/railway-crack-detection/15?api_key=FYe8IvPwEEQ19V0hf0jr',
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        // Implement exponential backoff for rate limiting
        const retryAfter = response.headers.get('Retry-After') || '5';
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
        return detectCracks(imageBlob); // Retry
      }
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    const predictions = data.predictions || [];
    
    return {
      hasCrack: predictions.length > 0,
      predictions: predictions,
      confidence: predictions.length > 0 ? predictions[0].confidence : undefined,
    };
  } catch (error) {
    console.error('Error detecting cracks:', error);
    throw error;
  }
};

// Function to parse a GPS log string into an array of coordinates
export const parseGPSLog = (gpsLogContent: string): GPSCoordinate[] => {
  const lines = gpsLogContent.split('\n').filter(line => line.trim().length > 0);
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    const [timestamp, latitude, longitude, accuracy] = line.split(',');
    return {
      timestamp,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
    };
  });
};

// Function to match a frame timestamp with the closest GPS coordinate
export const matchFrameToGPS = (
  frameTimestamp: string,
  gpsCoordinates: GPSCoordinate[],
  toleranceMs: number = 2000 // 2 second tolerance
): GPSCoordinate | null => {
  if (gpsCoordinates.length === 0) {
    return null;
  }
  
  const frameTime = new Date(frameTimestamp).getTime();
  
  let closestCoordinate: GPSCoordinate | null = null;
  let smallestTimeDiff = Infinity;
  
  for (const coordinate of gpsCoordinates) {
    const coordinateTime = new Date(coordinate.timestamp).getTime();
    const timeDiff = Math.abs(frameTime - coordinateTime);
    
    if (timeDiff < smallestTimeDiff) {
      smallestTimeDiff = timeDiff;
      closestCoordinate = coordinate;
    }
  }
  
  // Return the coordinate only if it's within the tolerance
  if (closestCoordinate && smallestTimeDiff <= toleranceMs) {
    return closestCoordinate;
  }
  
  return null;
};

// Function to draw bounding boxes on an image based on detection results
export const drawBoundingBoxes = (
  imageUrl: string,
  predictions: any[]
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(imageUrl);
        return;
      }
      
      // Draw the original image
      ctx.drawImage(img, 0, 0);
      
      // Draw bounding boxes
      predictions.forEach(prediction => {
        const { x, y, width, height, confidence, class: className } = prediction;
        
        // Calculate the box coordinates
        const boxX = x - width / 2;
        const boxY = y - height / 2;
        
        // Draw the box
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, boxY, width, height);
        
        // Draw the label background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        const textMetrics = ctx.measureText(`${className} ${(confidence * 100).toFixed(1)}%`);
        ctx.fillRect(boxX, boxY - 25, textMetrics.width + 10, 25);
        
        // Draw the label text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(
          `${className} ${(confidence * 100).toFixed(1)}%`,
          boxX + 5,
          boxY - 7
        );
      });
      
      // Convert canvas to image URL
      resolve(canvas.toDataURL('image/jpeg'));
    };
    
    img.onerror = () => {
      console.error('Failed to load image for drawing bounding boxes');
      resolve(imageUrl);
    };
    
    img.src = imageUrl;
  });
};
