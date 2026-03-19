import { useRef, useCallback, useEffect } from 'react';

interface UseIpCameraReturn {
  imgRef: React.RefObject<HTMLImageElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startIpRecording: () => MediaRecorder | null;
  stopIpStream: () => void;
  drawToCanvas: () => void;
}

export function useIpCamera(streamUrl: string): UseIpCameraReturn {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const drawToCanvas = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth || 640;
    canvas.height = img.naturalHeight || 480;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    animFrameRef.current = requestAnimationFrame(drawToCanvas);
  }, []);

  const startIpRecording = useCallback((): MediaRecorder | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    // Ensure canvas is drawing
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    drawToCanvas();

    const stream = canvas.captureStream(15); // 15 fps
    
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 500000,
      });
      console.log(`IP Camera MediaRecorder created with ${mimeType}`);
      return recorder;
    } catch (err) {
      console.error('Failed to create MediaRecorder for IP camera:', err);
      return null;
    }
  }, [drawToCanvas]);

  const stopIpStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return { imgRef, canvasRef, startIpRecording, stopIpStream, drawToCanvas };
}
