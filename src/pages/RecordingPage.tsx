
import React from 'react';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Toaster } from '@/components/ui/toaster';

const RecordingPage: React.FC = () => {
  return (
    <div className="container py-6 px-4">
      <VideoRecorder />
      <Toaster />
    </div>
  );
};

export default RecordingPage;
