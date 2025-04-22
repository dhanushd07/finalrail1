import { GPSCoordinate } from '@/types';

// Function to extract frames from a video
export const extractFrames = async (videoBlob: Blob, fps: number = 1): Promise<Blob[]> => {
  console.log('Extracting frames from video at', fps, 'fps');
  
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.autoplay = false;
      video.muted = true;
      video.playsInline = true;
      
      // Create object URL for the video blob
      const videoUrl = URL.createObjectURL(videoBlob);
      video.src = videoUrl;
      
      const frames: Blob[] = [];
      let currentTime = 0;
      const frameInterval = 1 / fps; // Time between frames in seconds
      
      // Load metadata to get video duration
      video.onloadedmetadata = () => {
        const videoDuration = video.duration;
        console.log('Video duration:', videoDuration, 'seconds');
        
        video.onseeked = async () => {
          try {
            // Create canvas to capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            
            // Draw current frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to blob
            canvas.toBlob((blob) => {
              if (blob) {
                frames.push(blob);
                console.log(`Captured frame at ${currentTime.toFixed(1)} seconds`);
                
                // Move to next frame or finish
                currentTime += frameInterval;
                if (currentTime < videoDuration) {
                  video.currentTime = currentTime;
                } else {
                  // Clean up
                  URL.revokeObjectURL(videoUrl);
                  console.log(`Extracted ${frames.length} frames from video`);
                  resolve(frames);
                }
              } else {
                reject(new Error('Failed to convert canvas to blob'));
              }
            }, 'image/jpeg', 0.95);
          } catch (error) {
            console.error('Error during frame extraction:', error);
            reject(error);
          }
        };
        
        // Start seeking to first frame
        video.currentTime = currentTime;
      };
      
      video.onerror = (e) => {
        console.error('Video error during frame extraction:', e);
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Error loading video for frame extraction'));
      };
      
    } catch (error) {
      console.error('Frame extraction failed:', error);
      reject(error);
    }
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
    const parts = line.split(',');
    
    // Check if this is the new seconds-based format
    if (parts.length >= 3 && !isNaN(Number(parts[0]))) {
      const [second, latitude, longitude, accuracy] = parts;
      return {
        second: parseInt(second, 10),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
      };
    } 
    // Fallback for older timestamp-based format
    else if (parts.length >= 3) {
      const [timestamp, latitude, longitude, accuracy] = parts;
      return {
        second: 0, // Default for backward compatibility
        timestamp,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
      };
    }
    
    // Default case if format is unknown
    return {
      second: 0,
      latitude: 0,
      longitude: 0
    };
  });
};

// Function to match a frame second with the corresponding GPS coordinate
export const matchFrameToGPS = (
  frameSecond: number,
  gpsCoordinates: GPSCoordinate[]
): GPSCoordinate | null => {
  if (gpsCoordinates.length === 0) {
    return null;
  }
  
  // First try to find an exact match by second
  const exactMatch = gpsCoordinates.find(coord => coord.second === frameSecond);
  if (exactMatch) {
    return exactMatch;
  }
  
  // If no exact match, find the closest second
  let closestCoordinate: GPSCoordinate | null = null;
  let smallestSecondDiff = Infinity;
  
  for (const coordinate of gpsCoordinates) {
    const secondDiff = Math.abs(frameSecond - coordinate.second);
    
    if (secondDiff < smallestSecondDiff) {
      smallestSecondDiff = secondDiff;
      closestCoordinate = coordinate;
    }
  }
  
  // Return the closest coordinate if it's within a reasonable range (5 seconds)
  if (closestCoordinate && smallestSecondDiff <= 5) {
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
