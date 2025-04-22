
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getVideoById, getDetectionData } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { VideoRecord } from '@/types';

const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get('videoId');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [detections, setDetections] = useState<any[]>([]);

  useEffect(() => {
    if (videoId) {
      fetchVideoData(videoId);
    } else {
      setLoading(false);
    }
  }, [videoId]);

  const fetchVideoData = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch video details
      const videoData = await getVideoById(id);
      setVideo(videoData);
      
      // Fetch detection results
      const detectionResults = await getDetectionData(id);
      setDetections(detectionResults || []);
      
    } catch (error) {
      console.error('Error fetching video data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Select a video from the Processing page to view analysis results.
        </p>
        <div className="p-8 text-center border rounded-lg">
          No video selected. Please go to the Processing page and select a completed video.
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          The requested video could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analysis Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Video {video.id.substring(0, 8)}</CardTitle>
          <CardDescription>
            Processed on {new Date(video.created_at).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-black rounded-md overflow-hidden mb-4">
            <video 
              src={video.video_url} 
              controls
              className="w-full h-full"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="detections">
        <TabsList>
          <TabsTrigger value="detections">Detections ({detections.length})</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="detections" className="space-y-4 mt-4">
          {detections.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No detections found for this video</p>
            </div>
          ) : (
            detections.map((detection) => (
              <Card key={detection.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {detection.has_crack ? 'Crack Detected' : 'No Crack'}
                  </CardTitle>
                  <CardDescription>
                    Time: {new Date(detection.timestamp).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {detection.image_url && (
                    <div className="aspect-video bg-black rounded-md overflow-hidden mb-2">
                      <img 
                        src={detection.image_url} 
                        alt="Detection frame" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  {detection.latitude && detection.longitude && (
                    <div className="text-sm text-muted-foreground">
                      Location: {detection.latitude.toFixed(6)}, {detection.longitude.toFixed(6)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="map" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="h-96 bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Map view will be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;
