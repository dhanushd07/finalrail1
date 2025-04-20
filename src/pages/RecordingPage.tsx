
import React from 'react';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Toaster } from '@/components/ui/toaster';

const RecordingPage: React.FC = () => {
  return (
    <>
      <VideoRecorder />
      <Toaster />
    </>
  );
};

export default RecordingPage;
