import React, { useState } from 'react';
import { ImageAsset } from '../types';
import * as workflowController from '../workflowController';

interface VeoStudioProps {
  asset: ImageAsset;
  onError: (msg: string) => void;
}

const VeoStudio: React.FC<VeoStudioProps> = ({ asset, onError }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [template, setTemplate] = useState<'PAN' | 'REVEAL' | 'REEL'>('PAN');

  const handleGenerate = async () => {
    // Check Key
    if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try {
                await (window as any).aistudio.openSelectKey();
            } catch (e) {
                onError("API Key selection required for Video.");
                return;
            }
        }
    }

    setIsGenerating(true);
    try {
        const url = await workflowController.runAnimation(asset, { template });
        setVideoUrl(url);
    } catch (error: any) {
        onError(error.message || "Video generation failed");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2 text-purple-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Veo Video Studio
        </h3>
        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold tracking-wide">BETA</span>
      </div>

      {!videoUrl ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                    onClick={() => setTemplate('PAN')}
                    className={`p-3 rounded-lg border text-left transition-all ${template === 'PAN' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200 bg-white hover:border-purple-300'}`}
                >
                    <div className="font-semibold text-slate-800 text-sm mb-1">Cinematic Pan</div>
                    <div className="text-xs text-slate-500">Horizontal landscape movement.</div>
                </button>
                <button 
                    onClick={() => setTemplate('REVEAL')}
                    className={`p-3 rounded-lg border text-left transition-all ${template === 'REVEAL' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200 bg-white hover:border-purple-300'}`}
                >
                    <div className="font-semibold text-slate-800 text-sm mb-1">Detail Reveal</div>
                    <div className="text-xs text-slate-500">Slow zoom on key features.</div>
                </button>
                <button 
                    onClick={() => setTemplate('REEL')}
                    className={`p-3 rounded-lg border text-left transition-all ${template === 'REEL' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200 bg-white hover:border-purple-300'}`}
                >
                    <div className="font-semibold text-slate-800 text-sm mb-1">Vertical Reel</div>
                    <div className="text-xs text-slate-500">9:16 format for Instagram/TikTok.</div>
                </button>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium flex items-center justify-center space-x-2 disabled:opacity-70"
            >
                {isGenerating ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating Video (~1 min)...</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                        <span>Generate Animation</span>
                    </>
                )}
            </button>
          </div>
      ) : (
          <div className="space-y-4">
             <div className={`bg-black rounded-lg overflow-hidden relative mx-auto ${template === 'REEL' ? 'max-w-[250px] aspect-[9/16]' : 'aspect-video'}`}>
                <video 
                    src={videoUrl} 
                    controls 
                    autoPlay 
                    loop
                    className="w-full h-full object-cover"
                />
             </div>
             <div className="flex space-x-3">
                 <a 
                    href={videoUrl} 
                    download={`listing-video-${template}.mp4`}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-center text-sm font-medium"
                 >
                    Download MP4
                 </a>
                 <button 
                    onClick={() => setVideoUrl(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                 >
                    Back
                 </button>
             </div>
          </div>
      )}
    </div>
  );
};

export default VeoStudio;