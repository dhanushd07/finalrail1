
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { VideoRecord } from '@/types';
import { getVideoRecords, updateVideoStatus } from '@/lib/supabase';
import { Link } from 'react-router-dom';

const ProcessingQueue = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [queuedVideos, setQueuedVideos] = useState<VideoRecord[]>([]);
  const [completedVideos, setCompletedVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    if (user) {
      fetchVideos();
      
      // Poll for updates every 10 seconds
      const interval = setInterval(fetchVideos, 10000);
      
      return () => clearInterval(interval);
    }
  }, [user]);
  
  const fetchVideos = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch queued videos
      const queued = await getVideoRecords(user.id, 'Queued');
      setQueuedVideos(queued || []);
      
      // Fetch completed videos
      const completed = await getVideoRecords(user.id, 'Completed');
      setCompletedVideos(completed || []);
    } catch (error) {
      console.error('Error fetching video records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load processing queue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Simulate processing completion (for demo purposes)
  const simulateProcessingComplete = async (video: VideoRecord) => {
    try {
      await updateVideoStatus(video.id, 'Completed');
      
      // Update local state to reflect changes
      setQueuedVideos(prev => prev.filter(v => v.id !== video.id));
      setCompletedVideos(prev => [{ ...video, status: 'Completed' }, ...prev]);
      
      toast({
        title: 'Processing Complete',
        description: 'Your video has been processed successfully.',
      });
    } catch (error) {
      console.error('Error updating video status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update video status',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Video Processing</h1>
      
      <Tabs defaultValue="queued">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="queued">
            Queued ({queuedVideos.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedVideos.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="queued" className="space-y-4">
          {loading && queuedVideos.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : queuedVideos.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No videos in queue</p>
            </div>
          ) : (
            queuedVideos.map((video) => (
              <Card key={video.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Video className="h-5 w-5 mr-2" />
                    Video {video.id.substring(0, 8)}
                  </CardTitle>
                  <CardDescription>
                    Uploaded: {formatDate(video.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="flex items-center space-x-2 bg-primary/10 text-primary px-3 py-1 rounded-full">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="text-xs text-muted-foreground">
                    This may take a few minutes
                  </div>
                  
                  {/* TODO: Remove this button in production - it's just for demo */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto"
                    onClick={() => simulateProcessingComplete(video)}
                  >
                    Simulate Completion
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {loading && completedVideos.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : completedVideos.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No completed videos</p>
            </div>
          ) : (
            completedVideos.map((video) => (
              <Card key={video.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Video className="h-5 w-5 mr-2" />
                    Video {video.id.substring(0, 8)}
                  </CardTitle>
                  <CardDescription>
                    Processed: {formatDate(video.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                      <CheckCircle className="h-4 w-4" />
                      <span>Processing complete</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Link 
                    to={`/dashboard?videoId=${video.id}`}
                    className="ml-auto"
                  >
                    <Button>
                      View Results
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProcessingQueue;
