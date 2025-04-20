
import React from 'react';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Toaster } from '@/components/ui/toaster';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
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
      if (!user) {
        setIsCheckingBuckets(false);
        return;
      }
      
      try {
        setIsCheckingBuckets(true);
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          console.error('Error checking storage buckets:', error);
          setBucketError('Could not verify storage buckets. Please try again later.');
          return;
        }
        
        const requiredBuckets = ['videos', 'gps-logs'];
        
        // Even if buckets are found via listBuckets, we need to verify direct access
        // as policies might prevent the current user from accessing them
        for (const bucketName of requiredBuckets) {
          // First check if bucket exists in the list
          const bucketExists = buckets.some(bucket => bucket.name === bucketName || bucket.id === bucketName);
          
          if (!bucketExists) {
            setBucketError(`Required storage bucket is missing: ${bucketName}. Please contact an administrator.`);
            return;
          }
          
          // Then verify access by trying to list files in the bucket (this will test policies)
          const { error: accessError } = await supabase.storage
            .from(bucketName)
            .list(user?.id || '');
            
          if (accessError) {
            console.error(`Access error for bucket ${bucketName}:`, accessError);
            
            // Check if it's a permissions error
            if (accessError.message.includes('permission') || accessError.message.includes('access')) {
              setBucketError(`Permission denied accessing the ${bucketName} bucket. Please check your access rights.`);
              return;
            }
            
            setBucketError(`Cannot access the ${bucketName} bucket. Error: ${accessError.message}`);
            return;
          }
        }
        
        // If we got here, all buckets exist and are accessible
        setBucketError(null);
        
      } catch (err) {
        console.error('Error in bucket verification:', err);
        setBucketError('An error occurred while checking storage configuration.');
      } finally {
        setIsCheckingBuckets(false);
      }
    };
    
    checkBuckets();
  }, [user]);
  
  return (
    <div className="container mx-auto py-6">
      {isCheckingBuckets ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying storage configuration...</p>
        </div>
      ) : bucketError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Storage Configuration Error</AlertTitle>
          <AlertDescription>{bucketError}</AlertDescription>
        </Alert>
      ) : (
        <VideoRecorder />
      )}
      <Toaster />
    </div>
  );
};

export default RecordingPage;
