
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

      video.onloadedmetadata = () => {
        const videoDuration = video.duration;
        console.log('Video duration:', videoDuration, 'seconds');

        const captureFrame = () => {
          if (currentTime > videoDuration) {
            URL.revokeObjectURL(videoUrl);
            console.log(`Extracted ${frames.length} frames from video`);
            resolve(frames);
            return;
          }
          video.currentTime = currentTime;
        };

        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (blob) {
              frames.push(blob);
              console.log(`Captured frame at ${currentTime.toFixed(1)} seconds`);
              currentTime += frameInterval;
              captureFrame();
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/jpeg', 0.95);
        };

        captureFrame();
      };

      video.onerror = (e) => {
        console.error('Video error during frame extraction:', e);
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Error loading video for frame extraction'));
      };

      video.load();

    } catch (error) {
      console.error('Frame extraction failed:', error);
      reject(error);
    }
  });
};
