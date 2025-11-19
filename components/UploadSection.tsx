import React, { useCallback } from 'react';
import { createAssetFromFile } from '../services/storageService';
import { ImageAsset } from '../types';

interface UploadSectionProps {
  onUpload: (assets: ImageAsset[]) => void;
  compact?: boolean;
  title?: string;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onUpload, compact = false, title }) => {
  
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAssets: ImageAsset[] = [];

    // In a real app, this would show a loading bar per image
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const asset = await createAssetFromFile(file);
            newAssets.push(asset);
        } catch (error) {
            console.error(`Failed to upload ${file.name}`, error);
        }
    }
    
    onUpload(newAssets);
    // Reset input
    event.target.value = '';
  }, [onUpload]);

  return (
    <div className={`w-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center text-center group cursor-pointer ${compact ? 'p-4 min-h-[150px]' : 'p-10 min-h-[350px]'}`}>
      <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
        {!compact && (
            <div className="mb-6 p-5 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-brand-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
            </div>
        )}
        {compact && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400 mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
        )}
        
        <h3 className={`${compact ? 'text-sm' : 'text-2xl'} font-semibold text-slate-800 mb-1`}>
            {title || (compact ? "Add Photos" : "Upload Listing Photos")}
        </h3>
        
        {!compact && <p className="text-slate-500 mb-8 max-w-md">Drag and drop single or multiple images here.</p>}
        
        <div className={`${compact ? 'px-4 py-1.5 text-xs' : 'px-8 py-3'} bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors shadow-md mt-2`}>
            Select Photos
        </div>
        <input type="file" className="hidden" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
      </label>
    </div>
  );
};

export default UploadSection;
