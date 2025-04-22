import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { detectCracks, drawBoundingBoxes, CrackDetectionResult } from '@/lib/videoProcessing';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ModelTestPage: React.FC = () => {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<CrackDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResults(null);
    setProcessedImage(null);
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setError('Selected file is not an image');
      return;
    }
    
    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDetection = async () => {
    if (!selectedImage) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const detectionResult = await detectCracks(selectedImage);
      setResults(detectionResult);
      
      if (preview && detectionResult.predictions.length > 0) {
        const imageWithBoxes = await drawBoundingBoxes(preview, detectionResult.predictions);
        setProcessedImage(imageWithBoxes);
      }
      
      toast({
        title: detectionResult.hasCrack ? 'Crack Detected' : 'No Cracks Found',
        description: detectionResult.hasCrack 
          ? `Detection confidence: ${Math.round((detectionResult.confidence || 0) * 100)}%`
          : 'The model did not detect any cracks in this image',
      });
    } catch (err) {
      console.error('Error detecting cracks:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Model Testing</h1>
      <p className="text-muted-foreground">
        Upload images to test the crack detection model in real-time.
      </p>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={loading}
              />
              <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-center text-muted-foreground">
                Click to upload or drag and drop<br />
                JPG, PNG, JPEG (max 5MB)
              </p>
              {selectedImage && (
                <p className="text-sm font-medium mt-2">{selectedImage.name}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              disabled={!selectedImage || loading}
              onClick={handleDetection}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Detect Cracks'
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] p-0">
            {processedImage || preview ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={processedImage || preview}
                  alt="Preview"
                  className="max-w-full max-h-[300px] object-contain rounded-md"
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-6">
                {loading ? (
                  <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2" />
                ) : (
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                )}
                <p>{loading ? 'Processing image...' : 'No image uploaded'}</p>
              </div>
            )}
          </CardContent>
          {results && (
            <CardFooter className="flex flex-col items-start w-full">
              <div className="w-full">
                <h3 className="text-sm font-medium mb-2">Detection Results:</h3>
                <div className={`text-sm p-2 rounded-md ${
                  results.hasCrack 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {results.hasCrack 
                    ? `Crack detected with ${Math.round((results.confidence || 0) * 100)}% confidence` 
                    : 'No cracks detected'
                  }
                </div>
                {results.predictions.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {results.predictions.length} detection{results.predictions.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ModelTestPage;
