
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import CrackMap from '@/components/dashboard/CrackMap';
import VideoDetails from '@/components/dashboard/VideoDetails';
import { getVideoById, getDetectionData } from '@/lib/supabase';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get('videoId');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [video, setVideo] = useState<any>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('map');
  
  useEffect(() => {
    if (videoId && user) {
      loadVideoData(videoId);
    }
  }, [videoId, user]);
  
  const loadVideoData = async (videoId: string) => {
    try {
      setLoading(true);
      
      // Load video details
      const videoData = await getVideoById(videoId);
      if (!videoData) {
        toast({
          title: 'Error',
          description: 'Video not found',
          variant: 'destructive',
        });
        return;
      }
      setVideo(videoData);
      
      // Load detection data
      const detectionData = await getDetectionData(videoId);
      setDetections(detectionData || []);
      
    } catch (error) {
      console.error('Error loading video data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load video data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Count cracks
  const crackCount = detections.filter(d => d.has_crack).length;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analysis Dashboard</h1>
      
      {!videoId ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-muted-foreground">
            Select a video from the Processing page to view analysis results.
          </p>
        </div>
      ) : (
        <>
          {video && (
            <VideoDetails video={video} crackCount={crackCount} detectionCount={detections.length} />
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="map">Map View</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="map" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Crack Locations</CardTitle>
                </CardHeader>
                <CardContent className="h-[500px]">
                  <CrackMap detections={detections.filter(d => d.has_crack)} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="table" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Detection Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {detections.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No detection data available.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Preview</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detections.map((detection) => (
                          <TableRow key={detection.id}>
                            <TableCell>
                              {new Date(detection.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${detection.has_crack ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                {detection.has_crack ? 'Crack Detected' : 'No Crack'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {detection.latitude && detection.longitude ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="text-xs">
                                    {detection.latitude.toFixed(5)}, {detection.longitude.toFixed(5)}
                                  </span>
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </TableCell>
                            <TableCell>
                              {detection.image_url && (
                                <img 
                                  src={detection.image_url} 
                                  alt="Frame" 
                                  className="h-16 w-auto object-cover rounded border"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
