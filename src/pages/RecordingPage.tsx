
import React from 'react';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/contexts/AuthContext';

const RecordingPage: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto py-6">
      <VideoRecorder />
      <Toaster />
    </div>
  );
};

export default RecordingPage;
