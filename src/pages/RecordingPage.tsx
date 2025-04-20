
import React from 'react';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Toaster } from '@/components/ui/toaster';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const RecordingPage: React.FC = () => {
  const { user } = useAuth();
  const [bucketError, setBucketError] = useState<string | null>(null);
  const [isCheckingBuckets, setIsCheckingBuckets] = useState<boolean>(true);
  
  // Check if required storage buckets exist on component mount
  useEffect(() => {
    const checkBuckets = async () => {
      try {
        setIsCheckingBuckets(true);
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
        } else {
          setBucketError(null);
          // Test access by trying to list files in each bucket
          for (const bucketName of requiredBuckets) {
            const { error: accessError } = await supabase.storage.from(bucketName).list(user?.id || 'test-folder');
            if (accessError) {
              console.error(`Access error for bucket ${bucketName}:`, accessError);
              setBucketError(`Cannot access the ${bucketName} bucket. Please check your permissions.`);
              break;
            }
          }
        }
      } catch (err) {
        console.error('Error in bucket verification:', err);
        setBucketError('An error occurred while checking storage configuration.');
      } finally {
        setIsCheckingBuckets(false);
      }
    };
    
    checkBuckets();
  }, [user?.id]);
  
  return (
    <div className="container mx-auto py-6">
      {bucketError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Storage Configuration Error</AlertTitle>
          <AlertDescription>{bucketError}</AlertDescription>
        </Alert>
      )}
      
      {!bucketError && (
        <VideoRecorder />
      )}
      <Toaster />
    </div>
  );
};

export default RecordingPage;
