import { useRef, useState, useCallback, useEffect } from 'react';

export type IpStreamStatus = 'idle' | 'loading' | 'connected' | 'error';

interface UseIpCameraReturn {
  imgRef: React.RefObject<HTMLImageElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startIpRecording: () => MediaRecorder | null;
  stopIpStream: () => void;
  drawToCanvas: () => void;
  streamStatus: IpStreamStatus;
  streamError: string | null;
}

export function useIpCamera(streamUrl: string): UseIpCameraReturn {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const [streamStatus, setStreamStatus] = useState<IpStreamStatus>('idle');
  const [streamError, setStreamError] = useState<string | null>(null);

  // Track stream URL changes and reset status
  useEffect(() => {
    if (!streamUrl) {
      setStreamStatus('idle');
      setStreamError(null);
      return;
    }

    // Validate URL format
    try {
      new URL(streamUrl);
    } catch {
      setStreamStatus('error');
      setStreamError('Invalid URL format. Please enter a valid URL (e.g., https://your-camera/stream)');
      return;
    }

    setStreamStatus('loading');
    setStreamError(null);
    console.log(`[IP Camera] Attempting to connect to stream: ${streamUrl}`);
  }, [streamUrl]);

  // Handle img load/error events via effect
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !streamUrl) return;

    const handleLoad = () => {
      console.log(`[IP Camera] Stream loaded successfully from: ${streamUrl}`);
      setStreamStatus('connected');
      setStreamError(null);
    };

    const handleError = () => {
      console.error(`[IP Camera] Failed to load stream from: ${streamUrl}`);
      setStreamStatus('error');
      setStreamError(
        `Cannot load stream from "${streamUrl}". Possible causes:\n` +
        '• The URL is incorrect or the camera is offline\n' +
        '• CORS is blocking the request (camera must allow cross-origin)\n' +
        '• The stream format is not supported by the browser'
      );
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [streamUrl]);

  const drawToCanvas = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) {
      console.error('[IP Camera] Canvas draw failed:', !img ? 'img element not found' : 'canvas element not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[IP Camera] Canvas draw failed: could not get 2d context');
      return;
    }

    const w = img.naturalWidth || 640;
    const h = img.naturalHeight || 480;
    canvas.width = w;
    canvas.height = h;

    try {
      ctx.drawImage(img, 0, 0, w, h);
    } catch (err) {
      console.error('[IP Camera] Canvas drawImage failed (likely CORS or tainted canvas):', err);
    }

    animFrameRef.current = requestAnimationFrame(drawToCanvas);
  }, []);

  const startIpRecording = useCallback((): MediaRecorder | null => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[IP Camera] startIpRecording failed: canvas element not available');
      return null;
    }

    if (streamStatus !== 'connected') {
      console.error(`[IP Camera] startIpRecording failed: stream not connected (status: ${streamStatus})`);
      return null;
    }

    // Ensure canvas is drawing
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    drawToCanvas();

    let stream: MediaStream;
    try {
      stream = canvas.captureStream(15);
      console.log(`[IP Camera] captureStream created with ${stream.getTracks().length} track(s)`);
    } catch (err) {
      console.error('[IP Camera] canvas.captureStream() failed:', err);
      return null;
    }

    if (stream.getTracks().length === 0) {
      console.error('[IP Camera] captureStream returned 0 tracks — canvas may be empty or tainted');
      return null;
    }

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      console.warn(`[IP Camera] vp9 not supported, falling back to ${mimeType}`);
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.error('[IP Camera] No supported video/webm mime type found on this browser');
      return null;
    }

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 500000,
      });

      recorder.onerror = (event) => {
        console.error('[IP Camera] MediaRecorder error during recording:', event);
      };

      console.log(`[IP Camera] MediaRecorder created successfully (${mimeType}, 500kbps)`);
      return recorder;
    } catch (err) {
      console.error('[IP Camera] Failed to create MediaRecorder:', err);
      return null;
    }
  }, [drawToCanvas, streamStatus]);

  const stopIpStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
      console.log('[IP Camera] Canvas drawing stopped');
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

  return { imgRef, canvasRef, startIpRecording, stopIpStream, drawToCanvas, streamStatus, streamError };
}
