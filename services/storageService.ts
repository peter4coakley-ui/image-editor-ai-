import { ImageAsset } from '../types';
import { fileToBase64, getMimeType } from '../utils';

// MOCK STORAGE SERVICE
// In production, this would upload to S3/Supabase Storage and return a public URL.

export const uploadImage = async (file: File): Promise<string> => {
  // SIMULATION: Simulate network upload delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // In a real app, perform upload here.
  // For now, return base64 to keep it working in-browser.
  return await fileToBase64(file);
};

export const createAssetFromFile = async (file: File): Promise<ImageAsset> => {
    const url = await uploadImage(file);
    
    return {
        id: Math.random().toString(36).substring(2, 9),
        originalUrl: url,
        currentUrl: url,
        history: [url],
        filename: file.name,
        mimeType: getMimeType(url) || file.type,
        editLog: ["Original Upload"]
    };
};