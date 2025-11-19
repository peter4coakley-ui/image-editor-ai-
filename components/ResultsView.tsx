import React, { useState, useRef } from 'react';
import { ImageAsset, SelectionMode } from '../types';
import { downloadImage } from '../utils';

interface ResultsViewProps {
  asset: ImageAsset; // Acts as preview asset in batch mode
  onRevert: () => void;
  selectionMode?: SelectionMode;
  onObjectClick?: (x: number, y: number) => void;
  isBatchMode?: boolean;
  selectedCount?: number;
}

const ResultsView: React.FC<ResultsViewProps> = ({ 
    asset, 
    onRevert, 
    selectionMode = SelectionMode.NONE, 
    onObjectClick,
    isBatchMode = false,
    selectedCount = 0
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectionMode !== SelectionMode.NONE || isBatchMode) return;
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
      if (selectionMode !== SelectionMode.NONE || isBatchMode) return;
      if (!isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
      setSliderPos((x / rect.width) * 100);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isBatchMode) return;
      if (selectionMode !== SelectionMode.NONE && onObjectClick) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          onObjectClick(x, y);
          return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSliderPos((x / rect.width) * 100);
  };

  const cursorClass = isBatchMode 
      ? 'cursor-default' 
      : (selectionMode !== SelectionMode.NONE ? 'cursor-crosshair' : 'cursor-ew-resize');

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* BATCH MODE INFO OVERLAY */}
      {isBatchMode && (
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg text-center mb-2">
              <h3 className="text-lg font-bold text-indigo-900 mb-1">Batch Editing Active</h3>
              <p className="text-indigo-700 mb-2">Changes will be applied to {selectedCount} selected photos.</p>
              <div className="text-xs text-indigo-500">Previewing changes on the image below.</div>
          </div>
      )}

      {/* Comparison Viewer */}
      <div 
        ref={containerRef}
        className={`relative flex-1 w-full bg-slate-900 rounded-xl overflow-hidden group select-none ${cursorClass}`}
        onMouseDown={() => !isBatchMode && selectionMode === SelectionMode.NONE && setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={() => !isBatchMode && selectionMode === SelectionMode.NONE && setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        onTouchMove={handleTouchMove}
        onClick={handleContainerClick}
      >
         {/* After Image (Bottom Layer) */}
         <img 
          src={asset.currentUrl} 
          alt="After" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
        />

        {/* Before Image (Top Layer, Clipped) - Only show slider if NOT batch mode */}
        {!isBatchMode && (
            <div 
            className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none border-r-2 border-white/80 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            style={{ width: `${sliderPos}%` }}
            >
            <img 
                src={asset.originalUrl} 
                alt="Before" 
                className="absolute inset-0 w-full h-full object-contain" 
                style={{ width: `${100 / (sliderPos/100)}%`, maxWidth: 'none' }} 
            />
            </div>
        )}

        {/* Slider Handle - Only show if NOT batch mode and NOT selecting */}
        {!isBatchMode && selectionMode === SelectionMode.NONE && (
            <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white/50 flex items-center justify-center pointer-events-none"
            style={{ left: `${sliderPos}%` }}
            >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-brand-900">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
            </div>
            </div>
        )}

        {/* Selection Overlay */}
        {selectionMode !== SelectionMode.NONE && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 text-slate-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-bounce">
                    Click object to {selectionMode === SelectionMode.REMOVE ? 'REMOVE' : 'KEEP'}
                </div>
            </div>
        )}
      </div>

      {/* MLS Disclaimer */}
      <div className="text-[10px] text-slate-400 text-center italic">
          * MLS Compliant Mode: Edits are limited to non-material corrections. Always disclose digital edits.
      </div>

      {/* Download & Revert Controls */}
      <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="flex space-x-2">
            <button 
                onClick={onRevert}
                disabled={asset.history.length <= 1}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs flex items-center space-x-1 disabled:opacity-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
                <span>Undo</span>
            </button>
        </div>
        
        <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Export:</span>
            <button 
                onClick={() => downloadImage(asset.currentUrl, `preview-${asset.filename}`)}
                className="px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium text-xs"
            >
                1080p Preview
            </button>
            <button 
                onClick={() => downloadImage(asset.currentUrl, `full-${asset.filename}`)}
                className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-xs flex items-center space-x-1"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span>High Res</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
