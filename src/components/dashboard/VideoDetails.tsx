
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileVideo, Clock, AlertTriangle } from 'lucide-react';
import { VideoRecord } from '@/types';

interface VideoDetailsProps {
  video: VideoRecord;
  crackCount: number;
  detectionCount: number;
}

const VideoDetails: React.FC<VideoDetailsProps> = ({ video, crackCount, detectionCount }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="h-5 w-5" />
          Video Analysis Summary
        </CardTitle>
        <CardDescription>
          Uploaded on {new Date(video.created_at).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Processed {detectionCount} frames</span>
          </div>
          
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm">
              {crackCount} {crackCount === 1 ? 'crack' : 'cracks'} detected
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoDetails;
