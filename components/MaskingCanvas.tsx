import React, { useRef, useState, useEffect } from 'react';

interface MaskingCanvasProps {
  imageUrl: string;
  onCancel: () => void;
  onMaskSubmit: (maskBase64: string) => void;
}

const MaskingCanvas: React.FC<MaskingCanvasProps> = ({ imageUrl, onCancel, onMaskSubmit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [isEraser, setIsEraser] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Load image to get dimensions and set canvas size
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      // Fit to screen while maintaining aspect ratio logic is handled via CSS max-h/max-w
      // But canvas logical size should match display size or image size. 
      // To map 1:1, we use the image's natural size.
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Clear logic if needed
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
      }
    };
  }, [imageUrl]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    
    ctx.lineWidth = brushSize * (canvasRef.current!.width / 1000); // Scale brush relative to image width
    
    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // Draw red on screen
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas to generate the final mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    
    if (tCtx) {
        // 1. Fill background black (ignored area)
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // 2. Draw the mask shape from the visible canvas as White
        tCtx.drawImage(canvas, 0, 0);
        
        // We drew in Red with alpha on the visible canvas. We want solid White for the mask payload.
        // Use composite operation to turn non-transparent pixels to white.
        tCtx.globalCompositeOperation = 'source-in';
        tCtx.fillStyle = '#FFFFFF';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
    
    onMaskSubmit(tempCanvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="h-16 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-900">
        <div className="flex items-center space-x-4">
             <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full" title="Exit">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
             <h3 className="text-white font-semibold text-lg">Precise Mask Editor</h3>
        </div>
        
        <div className="flex space-x-4">
            <button 
                onClick={onCancel} 
                className="px-4 py-2 text-slate-300 hover:text-white font-medium text-sm"
            >
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium shadow-lg shadow-brand-900/20"
            >
                Apply Mask
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-14 bg-slate-800 flex items-center justify-center space-x-6 px-4 border-b border-slate-700">
         <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-lg">
            <button 
                onClick={() => setIsEraser(false)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!isEraser ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                Brush
            </button>
            <button 
                onClick={() => setIsEraser(true)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${isEraser ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                Eraser
            </button>
         </div>
         
         <div className="w-px h-8 bg-slate-700 mx-2"></div>

         <div className="flex items-center space-x-3">
            <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Brush Size</span>
            <input 
                type="range" 
                min="5" 
                max="100" 
                value={brushSize} 
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-32 accent-brand-500 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
            />
            <div 
                className="rounded-full bg-white border-2 border-slate-500" 
                style={{ width: Math.max(4, brushSize/2), height: Math.max(4, brushSize/2) }}
            ></div>
         </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-slate-950/50 cursor-crosshair">
         <div className="relative shadow-2xl border border-slate-800 rounded-lg overflow-hidden" style={{ maxHeight: 'calc(100vh - 180px)', maxWidth: '90vw' }}>
            {/* Base Image */}
            <img 
                src={imageUrl} 
                alt="Base" 
                className="max-h-[calc(100vh-180px)] max-w-[90vw] object-contain pointer-events-none select-none"
            />
            {/* Drawing Canvas Overlay - Absolute positioned to match image */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
         </div>
      </div>
      
      <div className="bg-slate-900 text-center py-3 text-slate-400 text-xs border-t border-slate-800">
          <span className="text-brand-400 font-bold">TIP:</span> Paint over the exact object or area you want to modify. Red overlay indicates the active mask.
      </div>
    </div>
  );
};

export default MaskingCanvas;