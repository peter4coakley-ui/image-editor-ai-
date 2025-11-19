import React, { useState, useEffect, useCallback } from 'react';
import ListingManager from './components/ListingManager';
import ControlPanel from './components/ControlPanel';
import ResultsView from './components/ResultsView';
import MaskingCanvas from './components/MaskingCanvas';
import VeoStudio from './components/VeoStudio';
import * as userStore from './services/userStore';
import * as listingStore from './services/listingStore';
import * as workflowController from './workflowController';
import { Listing, ImageAsset, SelectionMode, WorkflowConfig, WorkflowType, ProcessingState } from './types';
import { downloadImage } from './utils';

const App: React.FC = () => {
  // -- Application State --
  const [view, setView] = useState<'LISTINGS' | 'EDITOR'>('LISTINGS');
  const [user, setUser] = useState(userStore.getUserProfile());
  
  // -- Listing & Asset State --
  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  
  // -- UI Flags --
  const [isStrictMode, setIsStrictMode] = useState(true);
  const [showVeo, setShowVeo] = useState(false);
  const [showMasking, setShowMasking] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(SelectionMode.NONE);
  
  // -- Processing State --
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    statusMessage: '',
    progress: 0
  });
  const [error, setError] = useState<string | null>(null);

  // Listen for credit updates
  useEffect(() => {
    const handleUserUpdate = () => setUser(userStore.getUserProfile());
    window.addEventListener('user-update', handleUserUpdate);
    return () => window.removeEventListener('user-update', handleUserUpdate);
  }, []);

  // Derived State
  const activeAsset = activeListing?.assets.find(a => a.id === activeAssetId);
  const isBatchMode = selectedBatchIds.size > 1;

  // -- Handlers --

  const handleListingSelect = (listing: Listing) => {
    setActiveListing(listing);
    if (listing.assets.length > 0) {
      setActiveAssetId(listing.assets[0].id);
    }
    setView('EDITOR');
  };

  const handleAssetSelect = (id: string, multiSelect: boolean) => {
    if (multiSelect) {
        const newSet = new Set(selectedBatchIds);
        if (newSet.has(id)) {
            newSet.delete(id);
            // If we deselect the active one, switch active to another if available
            if (activeAssetId === id && newSet.size > 0) {
                setActiveAssetId(Array.from(newSet)[0]);
            }
        } else {
            newSet.add(id);
            setActiveAssetId(id); // Switch view to latest selection
        }
        setSelectedBatchIds(newSet);
    } else {
        setActiveAssetId(id);
        setSelectedBatchIds(new Set([id]));
    }
  };

  const handleBackToListings = async () => {
      setView('LISTINGS');
      setActiveListing(null);
      setSelectedBatchIds(new Set());
      setShowVeo(false);
      // Refresh listings in background
      await listingStore.getAllListings();
  };

  const refreshCurrentListing = async () => {
      if (activeListing) {
          const updated = await listingStore.getListingById(activeListing.id);
          if (updated) setActiveListing(updated);
      }
  };

  const handleWorkflow = async (config: WorkflowConfig) => {
    if (!activeListing || !activeAsset) return;
    setError(null);
    setProcessing({ isProcessing: true, statusMessage: 'Planning edits...', progress: 10 });

    try {
        // A. BATCH WORKFLOW
        if (isBatchMode || config.type === WorkflowType.BATCH_EDIT) {
            const targetIds = Array.from(selectedBatchIds);
            const assetsToProcess = activeListing.assets.filter(a => targetIds.includes(a.id));
            
            setProcessing({ isProcessing: true, statusMessage: `Processing ${assetsToProcess.length} images...`, progress: 20 });
            
            const results = await workflowController.runBatchWorkflow(
                assetsToProcess, 
                config, 
                activeAsset, 
                (current, total) => {
                    setProcessing({ 
                        isProcessing: true, 
                        statusMessage: `Processing ${current}/${total}...`, 
                        progress: 20 + (current/total * 80) 
                    });
                }
            );

            // Update assets locally
            const updatedAssets = activeListing.assets.map(a => {
                if (results.has(a.id)) {
                    const newUrl = results.get(a.id)!;
                    return { ...a, currentUrl: newUrl, history: [...a.history, newUrl], editLog: [...a.editLog, `Batch: ${config.options?.batchOperation || config.type}`] };
                }
                return a;
            });

            await listingStore.updateListing(activeListing.id, { assets: updatedAssets });
            await refreshCurrentListing();

        } 
        // B. SINGLE IMAGE WORKFLOW
        else {
            // 1. Plan
            const { plan, warnings } = await workflowController.planEdits(activeAsset, config);
            if (!plan.allowed) {
                throw new Error(plan.reasoning);
            }
            
            if (warnings.length > 0) {
                console.warn(warnings.join('\n'));
            }

            setProcessing({ isProcessing: true, statusMessage: 'Generating edits...', progress: 50 });
            
            // 2. Execute
            const resultUrl = await workflowController.applyEdits(activeAsset, plan);
            
            // 3. Save
            const updatedAsset = { 
                ...activeAsset, 
                currentUrl: resultUrl, 
                history: [...activeAsset.history, resultUrl],
                editLog: [...activeAsset.editLog, plan.userPrompt]
            };
            
            const newAssets = activeListing.assets.map(a => a.id === activeAsset.id ? updatedAsset : a);
            await listingStore.updateListing(activeListing.id, { assets: newAssets });
            await refreshCurrentListing();
        }

        // Handle credit deduction for single edit (batch handled in controller)
        if (!isBatchMode) {
            userStore.deductCredits(userStore.getCostForWorkflow(config.type));
            setUser(userStore.getUserProfile());
        }

    } catch (e: any) {
        setError(e.message || "Workflow failed");
        console.error(e);
    } finally {
        setProcessing({ isProcessing: false, statusMessage: '', progress: 0 });
        setSelectionMode(SelectionMode.NONE); // Reset selection tools
    }
  };

  const handleObjectSelection = async (x: number, y: number) => {
      if (!activeAsset || !activeListing) return;
      setError(null);
      setProcessing({ isProcessing: true, statusMessage: 'Analysing object...', progress: 30 });

      try {
          const config: WorkflowConfig = {
              type: selectionMode === SelectionMode.REMOVE ? WorkflowType.OBJECT_REMOVE : WorkflowType.OBJECT_KEEP,
              isStrictMode,
              qualityMode: 'QUALITY',
              options: { maskMode: selectionMode === SelectionMode.REMOVE ? 'REMOVE' : 'KEEP' }
          };

          const { newImageUrl, warnings } = await workflowController.runObjectSelectionPipeline(activeAsset, config, { x, y });

           const updatedAsset = { 
                ...activeAsset, 
                currentUrl: newImageUrl, 
                history: [...activeAsset.history, newImageUrl],
                editLog: [...activeAsset.editLog, `AI Object ${selectionMode}`]
            };
            
            const newAssets = activeListing.assets.map(a => a.id === activeAsset.id ? updatedAsset : a);
            await listingStore.updateListing(activeListing.id, { assets: newAssets });
            await refreshCurrentListing();

      } catch (e: any) {
          setError(e.message);
      } finally {
          setProcessing({ isProcessing: false, statusMessage: '', progress: 0 });
          setSelectionMode(SelectionMode.NONE);
      }
  };

  const handleMaskSubmit = async (maskBase64: string) => {
      setShowMasking(false);
      if (!activeAsset) return;
      
      handleWorkflow({
          type: WorkflowType.MASK_INPAINT,
          isStrictMode,
          qualityMode: 'QUALITY',
          options: {
              maskUrl: maskBase64,
              maskMode: 'REMOVE' // Default to remove for precise mask
          }
      });
  };

  const handleRevert = async () => {
      if (!activeAsset || !activeListing || activeAsset.history.length <= 1) return;
      
      const newHistory = [...activeAsset.history];
      newHistory.pop(); // Remove current
      const previousUrl = newHistory[newHistory.length - 1];
      
      const updatedAsset = {
          ...activeAsset,
          currentUrl: previousUrl,
          history: newHistory,
          editLog: [...activeAsset.editLog, "Reverted to previous version"]
      };
      
      const newAssets = activeListing.assets.map(a => a.id === activeAsset.id ? updatedAsset : a);
      await listingStore.updateListing(activeListing.id, { assets: newAssets });
      await refreshCurrentListing();
  };

  // --- Render ---

  if (view === 'LISTINGS') {
      return <ListingManager onSelectListing={handleListingSelect} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center">
                <button onClick={handleBackToListings} className="mr-4 p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-lg font-bold text-slate-800">{activeListing?.title}</h1>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="bg-slate-100 px-1.5 rounded">{activeListing?.assets.length} photos</span>
                        {isBatchMode && <span className="text-indigo-600 font-semibold bg-indigo-50 px-1.5 rounded">Batch: {selectedBatchIds.size} selected</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-6">
                {/* Mode Toggles */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button 
                        onClick={() => setShowVeo(false)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!showVeo ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                        Photo Editor
                    </button>
                    <button 
                        onClick={() => setShowVeo(true)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${showVeo ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 001.28-.53V4.75z" />
                        </svg>
                        Video
                    </button>
                </div>

                {/* Strict Mode Toggle */}
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" className="sr-only" checked={isStrictMode} onChange={(e) => setIsStrictMode(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${isStrictMode ? 'bg-green-600' : 'bg-amber-400'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isStrictMode ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-2 text-xs font-medium text-slate-600">
                        {isStrictMode ? 'MLS Strict' : 'Creative Mode'}
                    </span>
                </label>

                {/* Credits */}
                <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-500 mr-1.5">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.732 6.232a2.5 2.5 0 013.536 0 .75.75 0 101.06-1.06A4 4 0 006.5 8v.165c0 .364.034.728.1 1.085h-.35a.75.75 0 000 1.5h.737a5.25 5.25 0 01-.367 3.072l-.055.16a.75.75 0 001.42.492l.056-.161c.28-.81.427-1.65.437-2.501h2.272a.75.75 0 000-1.5H8.303a3.515 3.515 0 01-.164-.958V8a2.5 2.5 0 01.593-1.768z" clipRule="evenodd" />
                    </svg>
                    <span className="font-bold text-sm text-slate-700">{user.credits}</span>
                </div>
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Thumbnails */}
            <div className="w-24 md:w-32 bg-white border-r border-slate-200 flex flex-col overflow-y-auto no-scrollbar py-4 space-y-2">
                {activeListing?.assets.map((asset) => {
                    const isSelected = selectedBatchIds.has(asset.id);
                    const isActive = activeAssetId === asset.id;
                    return (
                        <div 
                            key={asset.id}
                            onClick={(e) => handleAssetSelect(asset.id, e.metaKey || e.ctrlKey)}
                            className={`relative mx-2 aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${isActive ? 'border-brand-600 ring-2 ring-brand-100' : isSelected ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-transparent hover:border-slate-300'}`}
                        >
                            <img src={asset.currentUrl} className="w-full h-full object-cover" alt="thumb" />
                            {isSelected && (
                                <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <div className="pt-4 px-2">
                     <button className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all flex flex-col items-center justify-center">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className="text-[10px] font-bold mt-1">ADD</span>
                     </button>
                </div>
            </div>

            {/* Center Stage */}
            <main className="flex-1 flex flex-col bg-slate-100 relative p-4 md:p-6 overflow-hidden">
                {activeAsset ? (
                    <div className="flex-1 flex flex-col h-full min-h-0">
                        {showVeo ? (
                            <VeoStudio asset={activeAsset} onError={(msg) => setError(msg)} />
                        ) : (
                            <ResultsView 
                                asset={activeAsset} 
                                onRevert={handleRevert}
                                selectionMode={selectionMode}
                                onObjectClick={handleObjectSelection}
                                isBatchMode={isBatchMode}
                                selectedCount={selectedBatchIds.size}
                            />
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">Select an image to start editing</div>
                )}

                {/* Error Toast */}
                {error && (
                    <div className="absolute bottom-6 left-6 right-6 md:left-auto md:w-96 bg-red-50 border border-red-200 p-4 rounded-lg shadow-lg flex items-start animate-fade-in z-50">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 mr-2 mt-0.5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-red-800">Operation Failed</h4>
                            <p className="text-xs text-red-600 mt-1">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Processing Overlay */}
                {processing.isProcessing && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40 rounded-xl">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                            <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-lg font-bold text-slate-800">{processing.statusMessage}</h3>
                            <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                                <div className="bg-brand-600 h-full transition-all duration-300" style={{ width: `${processing.progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Right Sidebar: Controls */}
            <div className="w-80 md:w-96 bg-white border-l border-slate-200 flex flex-col z-10 shadow-xl">
                {activeAsset && (
                     <ControlPanel 
                        asset={activeAsset}
                        isStrictMode={isStrictMode}
                        isBatchMode={isBatchMode}
                        selectedCount={selectedBatchIds.size}
                        onWorkflow={handleWorkflow}
                        onOpenMasking={() => setShowMasking(true)}
                        onSetSelectionMode={setSelectionMode}
                        selectionMode={selectionMode}
                        isProcessing={processing.isProcessing}
                     />
                )}
            </div>
        </div>

        {/* Masking Modal */}
        {showMasking && activeAsset && (
            <MaskingCanvas 
                imageUrl={activeAsset.currentUrl}
                onCancel={() => setShowMasking(false)}
                onMaskSubmit={handleMaskSubmit}
            />
        )}
    </div>
  );
};

export default App;