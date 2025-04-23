
/**
 * Utility function to extract frames from a video Blob at a given FPS.
 */
export const extractFrames = async (videoBlob: Blob, fps: number = 1): Promise<Blob[]> => {
  console.log('Extracting frames from video at', fps, 'fps');

  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.autoplay = false;
      video.muted = true;
      video.playsInline = true;

      const videoUrl = URL.createObjectURL(videoBlob);
      video.src = videoUrl;

      const frames: Blob[] = [];
      let currentTime = 0;
      const frameInterval = 1 / fps;

      // Add error handling for video loading
      video.onerror = (e) => {
        console.error('Video error during frame extraction:', e);
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Error loading video for frame extraction'));
      };

      // Wait for metadata to load before attempting to extract frames
      video.onloadedmetadata = () => {
        console.log('Video metadata loaded. Duration:', video.duration, 'seconds');
        const videoDuration = video.duration;

        // Ensure video is ready to play before extracting frames
        video.oncanplay = () => {
          console.log('Video ready to play, beginning frame extraction');
          
          const captureFrame = () => {
            if (currentTime > videoDuration) {
              URL.revokeObjectURL(videoUrl);
              console.log(`Completed extraction: ${frames.length} frames captured`);
              resolve(frames);
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
              reject(new Error('Failed to get canvas context'));
              return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
              if (blob) {
                frames.push(blob);
                console.log(`Frame captured at ${currentTime.toFixed(2)} seconds (${blob.size} bytes)`);
                currentTime += frameInterval;
                captureFrame();
              } else {
                console.error('Failed to convert canvas to blob');
                reject(new Error('Failed to convert canvas to blob'));
              }
            }, 'image/jpeg', 0.95);
          };

          // Start the frame extraction process
          captureFrame();
        };
        
        // Trigger the oncanplay event if the video is already ready
        if (video.readyState >= 3) { // HAVE_FUTURE_DATA or higher
          video.dispatchEvent(new Event('canplay'));
        }
      };

      // Load the video
      video.load();

    } catch (error) {
      console.error('Frame extraction failed:', error);
      reject(error);
    }
  });
};
