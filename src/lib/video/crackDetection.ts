
export const detectCracks = async (imageBlob: Blob): Promise<{
  hasCrack: boolean;
  predictions: any[];
  confidence?: number;
}> => {
  try {
    const formData = new FormData();
    formData.append('file', imageBlob);
    
    const response = await fetch(
      'https://detect.roboflow.com/railway-crack-detection/15?api_key=FYe8IvPwEEQ19V0hf0jr',
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '5';
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
        return detectCracks(imageBlob);
      }
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    const predictions = data.predictions || [];
    
    return {
      hasCrack: predictions.length > 0,
      predictions: predictions,
      confidence: predictions.length > 0 ? predictions[0].confidence : undefined,
    };
  } catch (error) {
    console.error('Error detecting cracks:', error);
    throw error;
  }
};
