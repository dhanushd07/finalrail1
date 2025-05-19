
import React from 'react';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Toaster } from '@/components/ui/toaster';

const RecordingPage: React.FC = () => {
  return (
    <div className="container max-w-4xl py-6 px-4">
      <VideoRecorder />
      <Toaster />
      
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h2 className="text-lg font-medium mb-2">About Reverse Proxy for ESP32-CAM</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Using a reverse proxy allows you to access your ESP32-CAM stream securely through HTTPS,
          which is required when your web application is served over HTTPS.
        </p>
        
        <div className="text-sm space-y-2">
          <h3 className="font-medium">How to set up a reverse proxy:</h3>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>Configure a web server like Nginx or Apache on a publicly accessible server</li>
            <li>Set up SSL/TLS certificates using Let's Encrypt</li>
            <li>Configure the server to forward requests to your ESP32-CAM's IP address</li>
            <li>Access your camera through https://your-domain.com/camera-endpoint</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RecordingPage;
