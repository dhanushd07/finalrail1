
import React from 'react';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Toaster } from '@/components/ui/toaster';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const RecordingPage: React.FC = () => {
  const [bucketError, setBucketError] = useState<string | null>(null);
  
  // Check if required storage buckets exist on component mount
  useEffect(() => {
    const checkBuckets = async () => {
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          console.error('Error checking storage buckets:', error);
          setBucketError('Could not verify storage buckets. Please try again later.');
          return;
        }
        
        const requiredBuckets = ['videos', 'gps-logs'];
        const missingBuckets = requiredBuckets.filter(
          required => !buckets.some(bucket => bucket.name === required)
        );
        
        if (missingBuckets.length > 0) {
          setBucketError(`Required storage buckets are missing: ${missingBuckets.join(', ')}. Please contact an administrator.`);
        }
      } catch (err) {
        console.error('Error in bucket verification:', err);
        setBucketError('An error occurred while checking storage configuration.');
      }
    };
    
    checkBuckets();
  }, []);
  
  return (
    <div className="container mx-auto py-6">
      {bucketError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Storage Configuration Error</AlertTitle>
          <AlertDescription>{bucketError}</AlertDescription>
        </Alert>
      )}
      
      <VideoRecorder />
      <Toaster />
    </div>
  );
};

export default RecordingPage;
