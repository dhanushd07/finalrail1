
export const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const drawBoundingBoxes = (
  imageUrl: string,
  predictions: any[]
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(imageUrl);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      predictions.forEach(prediction => {
        const { x, y, width, height, confidence, class: className } = prediction;
        
        const boxX = x - width / 2;
        const boxY = y - height / 2;
        
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, boxY, width, height);
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        const text = `${className} ${(confidence * 100).toFixed(1)}%`;
        const textMetrics = ctx.measureText(text);
        ctx.fillRect(boxX, boxY - 25, textMetrics.width + 10, 25);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(text, boxX + 5, boxY - 7);
      });
      
      resolve(canvas.toDataURL('image/jpeg'));
    };
    
    img.onerror = () => {
      console.error('Failed to load image for drawing bounding boxes');
      resolve(imageUrl);
    };
    
    img.src = imageUrl;
  });
};
