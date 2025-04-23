
/**
 * Utility function to extract frames from a video Blob at a given FPS.
 */
export const extractFrames = async (videoBlob: Blob, fps: number = 1): Promise<Blob[]> => {
  console.log(`Extracting frames from ${videoBlob.size} byte video at ${fps} fps`);
  
  if (!videoBlob || videoBlob.size === 0) {
    console.error('Invalid video blob: empty or zero size');
    throw new Error('Invalid video: The provided video is empty or corrupt');
  }

  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.autoplay = false;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';

      // Create object URL
      const videoUrl = URL.createObjectURL(videoBlob);
      video.src = videoUrl;

      const frames: Blob[] = [];
      let currentTime = 0;
      const frameInterval = 1 / fps;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      // Set a safety timeout in case video doesn't load or something blocks the process
      const safetyTimeout = setTimeout(() => {
        console.error('Frame extraction timed out after 30 seconds');
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Frame extraction timed out after 30 seconds'));
      }, 30000);

      // Add error handling for video loading
      video.onerror = (e) => {
        console.error('Video error during frame extraction:', video.error, e);
        URL.revokeObjectURL(videoUrl);
        clearTimeout(safetyTimeout);
        reject(new Error(`Error loading video: ${video.error?.message || 'Unknown error'}`));
      };

      // Wait for metadata to load before attempting to extract frames
      video.onloadedmetadata = () => {
        console.log(`Video metadata loaded. Duration: ${video.duration.toFixed(2)} seconds, dimensions: ${video.videoWidth}x${video.videoHeight}`);
        
        if (video.duration === Infinity || isNaN(video.duration) || video.duration === 0) {
          console.error('Invalid video duration:', video.duration);
          URL.revokeObjectURL(videoUrl);
          clearTimeout(safetyTimeout);
          reject(new Error('Invalid video: Could not determine video duration'));
          return;
        }

        const videoDuration = video.duration;
        
        // Calculate total expected frames
        const totalFrames = Math.floor(videoDuration * fps);
        console.log(`Expecting approximately ${totalFrames} frames at ${fps} fps`);

        // Ensure video is ready to play before extracting frames
        const processVideoWhenReady = () => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            console.log('Video ready to play, beginning frame extraction');
            
            const captureFrame = () => {
              if (currentTime > videoDuration) {
                URL.revokeObjectURL(videoUrl);
                clearTimeout(safetyTimeout);
                
                console.log(`Completed extraction: ${frames.length} frames captured`);
                
                if (frames.length === 0) {
                  reject(new Error('No frames were extracted from the video'));
                } else {
                  resolve(frames);
                }
                return;
              }
              
              console.log(`Setting video time to ${currentTime.toFixed(2)} seconds`);
              video.currentTime = currentTime;
            };

            video.onseeked = () => {
              console.log(`Video seeked to ${video.currentTime.toFixed(2)} seconds`);
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              
              console.log(`Canvas created with dimensions ${canvas.width}x${canvas.height}`);
              const ctx = canvas.getContext('2d');

              if (!ctx) {
                console.error('Failed to get canvas context');
                URL.revokeObjectURL(videoUrl);
                clearTimeout(safetyTimeout);
                reject(new Error('Failed to get canvas context'));
                return;
              }

              try {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                  if (blob) {
                    frames.push(blob);
                    console.log(`Frame captured at ${currentTime.toFixed(2)} seconds (${blob.size} bytes)`);
                    currentTime += frameInterval;
                    
                    // Use setTimeout to prevent call stack overflow for long videos
                    if (timeoutId) clearTimeout(timeoutId);
                    timeoutId = setTimeout(captureFrame, 0);
                  } else {
                    console.error('Failed to convert canvas to blob');
                    URL.revokeObjectURL(videoUrl);
                    clearTimeout(safetyTimeout);
                    reject(new Error('Failed to convert canvas to blob'));
                  }
                }, 'image/jpeg', 0.95);
              } catch (error) {
                console.error('Error drawing video to canvas:', error);
                URL.revokeObjectURL(videoUrl);
                clearTimeout(safetyTimeout);
                reject(new Error(`Error drawing video to canvas: ${error instanceof Error ? error.message : 'Unknown error'}`));
              }
            };

            // Start the frame extraction process
            captureFrame();
          } else {
            // Wait a bit longer for the video to be ready
            console.log(`Video not ready yet, readyState = ${video.readyState}`);
            setTimeout(processVideoWhenReady, 100);
          }
        };
        
        processVideoWhenReady();
      };

      // Load the video
      console.log('Loading video...');
      video.load();

    } catch (error) {
      console.error('Frame extraction failed:', error);
      reject(error);
    }
  });
};
