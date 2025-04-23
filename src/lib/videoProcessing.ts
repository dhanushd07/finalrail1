
// Refactored: Video processing utilities now imported from smaller utility files:
import { extractFrames } from './video/extractFrames';
import { parseGPSLog, matchFrameToGPS } from './video/gpsUtils';
import { drawBoundingBoxes } from './video/canvasUtils';
import { detectCracks } from './video/crackDetection';

// Export them if needed under this module for backward compatibility:
export {
  extractFrames,
  detectCracks,
  parseGPSLog,
  matchFrameToGPS,
  drawBoundingBoxes
};
