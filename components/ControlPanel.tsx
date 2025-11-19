import React, { useState, useRef } from 'react';
import { WorkflowType, CLUTTER_CATEGORIES, ColorSettings, ImageAsset, MaskMode, SelectionMode, SceneType } from '../types';
import { fileToBase64 } from '../utils';
import { WorkflowConfig } from '../types';

interface ControlPanelProps {
  asset: ImageAsset;
  isStrictMode: boolean;
  isBatchMode: boolean;
  selectedCount: number;
  onWorkflow: (config: WorkflowConfig) => void;
  onOpenMasking: () => void;
  onSetSelectionMode: (mode: SelectionMode) => void;
  selectionMode: SelectionMode;
  isProcessing: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
    asset, 
    isStrictMode, 
    isBatchMode,
    selectedCount,
    onWorkflow, 
    onOpenMasking, 
    onSetSelectionMode,
    selectionMode,
    isProcessing 
}) => {
  const [sceneType, setSceneType] = useState<SceneType>(SceneType.INDOOR);
  const [activeTab, setActiveTab] = useState<'presets' | 'clutter' | 'colors' | 'staging' | 'exterior' | 'style'>('presets');
  const [selectedClutter, setSelectedClutter] = useState<string[]>([]);
  const [colors, setColors] = useState<ColorSettings>({ walls: '', floors: '', cabinets: '', siding: '' });
  const [customPrompt, setCustomPrompt] = useState('');
  const [keepFurniture, setKeepFurniture] = useState(true);
  const [styleRefImage, setStyleRefImage] = useState<string | null>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  const toggleClutter = (item: string) => {
    setSelectedClutter(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleStyleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const base64 = await fileToBase64(e.target.files[0]);
          setStyleRefImage(base64);
      }
  };

  const triggerWorkflow = (type: WorkflowType, options: any = {}) => {
      if (isBatchMode) {
          onWorkflow({
              type: WorkflowType.BATCH_EDIT,
              isStrictMode,
              qualityMode: 'QUALITY' as any,
              options: {
                  ...options,
                  batchOperation: type 
              }
          });
      } else {
          onWorkflow({
              type,
              isStrictMode,
              qualityMode: 'QUALITY' as any,
              options
          });
      }
  };

  const showIndoor = sceneType === SceneType.INDOOR;
  const showOutdoor = sceneType === SceneType.OUTDOOR;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* BATCH HEADER */}
      {isBatchMode && (
          <div className="bg-indigo-50 p-4 border-b border-indigo-100 text-center">
              <div className="text-indigo-900 font-bold text-sm flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                  BATCH MODE ACTIVE
              </div>
              <div className="text-xs text-indigo-600 mt-1">{selectedCount} photos selected</div>
          </div>
      )}

      {/* SCENE TYPE TOGGLE */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-center">
          <div className="bg-white p-1 rounded-lg border border-slate-200 flex shadow-sm">
              <button 
                onClick={() => setSceneType(SceneType.INDOOR)}
                className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${sceneType === SceneType.INDOOR ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Indoor
              </button>
              <button 
                onClick={() => setSceneType(SceneType.OUTDOOR)}
                className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${sceneType === SceneType.OUTDOOR ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Outdoor
              </button>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('presets')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'presets' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>Presets</button>
        
        {showIndoor && (
            <>
                <button onClick={() => setActiveTab('clutter')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'clutter' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>Declutter</button>
                {!isStrictMode && (
                    <>
                        <button onClick={() => setActiveTab('colors')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'colors' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>Colors</button>
                        {!isBatchMode && <button onClick={() => setActiveTab('staging')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'staging' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>Staging</button>}
                    </>
                )}
            </>
        )}

        {showOutdoor && (
            <>
                <button onClick={() => setActiveTab('clutter')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'clutter' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>Declutter</button>
                {!isStrictMode && (
                     <button onClick={() => setActiveTab('exterior')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'exterior' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>Exterior</button>
                )}
            </>
        )}
      </div>

      <div className="p-4 overflow-y-auto flex-1 no-scrollbar">
        {/* PRESETS TAB */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
             <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="font-bold text-brand-800 text-sm">{isBatchMode ? 'Batch Clean Sweep' : 'Pro Clean Sweep'}</div>
                    <span className="bg-brand-200 text-brand-800 text-[10px] px-1.5 py-0.5 rounded">NEW</span>
                </div>
                {showIndoor && (
                    <label className="flex items-center space-x-2 mb-3 cursor-pointer">
                        <input type="checkbox" checked={keepFurniture} onChange={(e) => setKeepFurniture(e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500"/>
                        <span className="text-xs font-medium text-brand-900">Keep Furniture</span>
                    </label>
                )}
                <button disabled={isProcessing} onClick={() => triggerWorkflow(WorkflowType.PRO_CLEAN_SWEEP, { keepFurniture })} className="w-full py-2 bg-brand-600 text-white rounded text-xs font-bold hover:bg-brand-700 transition-colors shadow-sm">
                    {isBatchMode ? `APPLY TO ${selectedCount} PHOTOS` : 'RUN CLEAN SWEEP'}
                </button>
             </div>
             <button disabled={isProcessing} onClick={() => triggerWorkflow(WorkflowType.MLS_CLEAN)} className="w-full p-3 text-left border rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all">
                <div className="font-semibold text-slate-800">{isBatchMode ? 'Batch MLS Standard Clean' : 'MLS Standard Clean'}</div>
             </button>
             {showIndoor && (
                 <button disabled={isProcessing} onClick={() => triggerWorkflow(WorkflowType.LUXURY_ENHANCE)} className="w-full p-3 text-left border rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-all">
                    <div className="font-semibold text-slate-800">{isBatchMode ? 'Batch Luxury Enhance' : 'Luxury Enhancement'}</div>
                 </button>
             )}
             {showOutdoor && (
                 <>
                    <button disabled={isProcessing} onClick={() => triggerWorkflow(WorkflowType.TWILIGHT)} className="w-full p-3 text-left border rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                        <div className="font-semibold text-slate-800">{isBatchMode ? 'Batch Twilight Mode' : 'Twilight Mode'}</div>
                    </button>
                    {!isStrictMode && (
                        <button disabled={isProcessing} onClick={() => triggerWorkflow(WorkflowType.SKY_REPLACEMENT)} className="w-full p-3 text-left border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all">
                            <div className="font-semibold text-slate-800">{isBatchMode ? 'Batch Sky Swap' : 'Blue Sky Swap'}</div>
                        </button>
                    )}
                 </>
             )}

             <div className="mt-6 pt-4 border-t border-slate-100">
                <label className="block text-xs font-medium text-slate-700 mb-2">
                    {isBatchMode ? 'Batch Custom Edit Prompt' : 'Custom Edit Prompt'}
                </label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        placeholder={isBatchMode ? "E.g. Lighten all photos" : "E.g. Fix the rug"}
                    />
                    <button 
                        onClick={() => triggerWorkflow(WorkflowType.CUSTOM, { promptOverride: customPrompt })}
                        disabled={!customPrompt || isProcessing}
                        className="bg-slate-800 text-white px-3 rounded-lg hover:bg-slate-900"
                    >
                        Go
                    </button>
                </div>
             </div>
          </div>
        )}

        {/* CLUTTER TAB */}
        {activeTab === 'clutter' && (
          <div className="space-y-4">
            {!isBatchMode && (
                <>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">AI Object Selection</div>
                        <div className="flex gap-2">
                            <button onClick={() => onSetSelectionMode(selectionMode === SelectionMode.REMOVE ? SelectionMode.NONE : SelectionMode.REMOVE)} className={`flex-1 py-2 px-1 rounded text-xs font-bold transition-all ${selectionMode === SelectionMode.REMOVE ? 'bg-red-600 text-white shadow-md' : 'bg-white border border-slate-300 text-slate-700'}`}>{selectionMode === SelectionMode.REMOVE ? 'Click Object...' : 'Click to Remove'}</button>
                            {!isStrictMode && <button onClick={() => onSetSelectionMode(selectionMode === SelectionMode.KEEP ? SelectionMode.NONE : SelectionMode.KEEP)} className={`flex-1 py-2 px-1 rounded text-xs font-bold transition-all ${selectionMode === SelectionMode.KEEP ? 'bg-green-600 text-white shadow-md' : 'bg-white border border-slate-300 text-slate-700'}`}>{selectionMode === SelectionMode.KEEP ? 'Click Object...' : 'Click to Keep'}</button>}
                        </div>
                    </div>
                    <button disabled={isProcessing} onClick={onOpenMasking} className="w-full py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-all flex items-center justify-center space-x-2 shadow-md">
                        <span>Precise Mask Edit</span>
                    </button>
                    <div className="border-t border-slate-100 my-2"></div>
                </>
            )}
            <div className="text-sm text-slate-600 mb-2">Quick Select Removal:</div>
            <div className="grid grid-cols-1 gap-2">
                {CLUTTER_CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center space-x-3 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={selectedClutter.includes(cat)} onChange={() => toggleClutter(cat)} className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"/>
                        <span className="text-sm text-slate-700">{cat}</span>
                    </label>
                ))}
            </div>
            <button disabled={isProcessing || selectedClutter.length === 0} onClick={() => triggerWorkflow(WorkflowType.DECLUTTER, { clutterCategories: selectedClutter })} className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
                {isBatchMode ? `Batch Remove Selected` : `Remove Selected (${selectedClutter.length})`}
            </button>
          </div>
        )}

        {/* COLORS TAB (Indoor) */}
        {activeTab === 'colors' && showIndoor && !isStrictMode && (
          <div className="space-y-5">
             <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Wall Paint</label>
                <div className="flex gap-2 flex-wrap">
                    {['#FFFFFF', '#F5F5DC', '#D3D3D3', '#708090', '#ADD8E6'].map(c => (
                        <button key={c} onClick={() => setColors({...colors, walls: c})} className={`w-8 h-8 rounded-full border shadow-sm ${colors.walls === c ? 'ring-2 ring-brand-500 scale-110' : ''}`} style={{backgroundColor: c}}/>
                    ))}
                    <button onClick={() => setColors({...colors, walls: ''})} className="px-2 text-xs text-slate-400 underline">Reset</button>
                </div>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Flooring Material</label>
                <select value={colors.floors || ''} onChange={(e) => setColors({...colors, floors: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50">
                    <option value="">No Change</option>
                    <option value="Light European Oak">Light European Oak</option>
                    <option value="Dark Walnut Wood">Dark Walnut Wood</option>
                    <option value="Grey Berber Carpet">Grey Berber Carpet</option>
                    <option value="White Marble Tile">White Marble Tile</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cabinet Finish</label>
                <select value={colors.cabinets || ''} onChange={(e) => setColors({...colors, cabinets: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50">
                    <option value="">No Change</option>
                    <option value="White Matte">White Matte</option>
                    <option value="Navy Blue Shaker">Navy Blue Shaker</option>
                    <option value="Natural Oak">Natural Oak</option>
                </select>
             </div>
             <button disabled={isProcessing} onClick={() => triggerWorkflow(WorkflowType.CUSTOM, { colors })} className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 shadow-sm">
                {isBatchMode ? 'Apply Batch Interior Changes' : 'Apply Interior Changes'}
            </button>
          </div>
        )}

        {/* EXTERIOR TAB (Outdoor, Not Strict) */}
        {activeTab === 'exterior' && showOutdoor && !isStrictMode && (
            <div className="space-y-6">
                {/* Siding Control */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Siding Material</label>
                    <select 
                        value={colors.siding || ''}
                        onChange={(e) => setColors({...colors, siding: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                    >
                        <option value="">No Change</option>
                        <option value="White Vinyl Siding">White Vinyl Siding</option>
                        <option value="Grey Horizontal Plank">Grey Horizontal Plank</option>
                        <option value="Red Brick">Red Brick</option>
                        <option value="Modern Stucco">Modern Stucco</option>
                        <option value="Cedar Shingles">Cedar Shingles</option>
                    </select>
                    <button 
                        disabled={isProcessing || !colors.siding} 
                        onClick={() => triggerWorkflow(WorkflowType.EXTERIOR_SIDING, { colors })} 
                        className="mt-2 w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700"
                    >
                        {isBatchMode ? 'Apply Batch Siding Change' : 'Apply Siding Change'}
                    </button>
                </div>

                <div className="border-t border-slate-100"></div>

                {/* Backyard Landscaping */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Backyard Landscaping</label>
                    <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => triggerWorkflow(WorkflowType.BACKYARD_LANDSCAPING, { landscapingStyle: 'Modern with Pavers' })}
                            className="p-2 border rounded text-xs hover:bg-green-50 text-slate-700"
                         >
                            Modern Patio
                         </button>
                         <button 
                            onClick={() => triggerWorkflow(WorkflowType.BACKYARD_LANDSCAPING, { landscapingStyle: 'Lush Garden' })}
                            className="p-2 border rounded text-xs hover:bg-green-50 text-slate-700"
                         >
                            Lush Garden
                         </button>
                         <button 
                            onClick={() => triggerWorkflow(WorkflowType.BACKYARD_LANDSCAPING, { landscapingStyle: 'Luxury Pool' })}
                            className="p-2 border rounded text-xs hover:bg-blue-50 text-slate-700"
                         >
                            Add Pool
                         </button>
                         <button 
                            onClick={() => triggerWorkflow(WorkflowType.BACKYARD_LANDSCAPING, { landscapingStyle: 'Fresh Turf' })}
                            className="p-2 border rounded text-xs hover:bg-green-50 text-slate-700"
                         >
                            Fresh Lawn
                         </button>
                    </div>
                </div>
            </div>
        )}

        {/* STAGING (Single Mode Only) */}
        {activeTab === 'staging' && showIndoor && !isStrictMode && !isBatchMode && (
            <div className="space-y-6">
                <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Quick Add Item</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {['Modern Sofa', 'Coffee Table', 'Flat Screen TV', 'Floor Lamp', 'Area Rug', 'Indoor Plant'].map(item => (
                            <button key={item} disabled={isProcessing} onClick={() => triggerWorkflow(WorkflowType.STAGING, { stagingItem: item })} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-xs font-medium text-center transition-colors">+ {item}</button>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;