import React, { useState, useEffect } from 'react';
import { Listing, getAllListings, createListing, deleteListing } from '../services/listingStore';
import { ImageAsset } from '../types';
import UploadSection from './UploadSection';

interface ListingManagerProps {
  onSelectListing: (listing: Listing) => void;
}

const ListingManager: React.FC<ListingManagerProps> = ({ onSelectListing }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Listing Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newAssets, setNewAssets] = useState<ImageAsset[]>([]);

  useEffect(() => {
    refreshListings();
  }, []);

  const refreshListings = async () => {
    setIsLoading(true);
    const data = await getAllListings();
    setListings(data);
    setIsLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this listing?')) {
      // Optimistic update
      setListings(prev => prev.filter(l => l.id !== id));
      await deleteListing(id);
      // No need to refresh if successful, we updated locally
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    
    await createListing({
        title: newTitle,
        address: newAddress,
        assets: newAssets
    });
    
    setIsCreating(false);
    setShowModal(false);
    setNewTitle('');
    setNewAddress('');
    setNewAssets([]);
    refreshListings();
  };

  const handleInitialUpload = (assets: ImageAsset[]) => {
      setNewAssets(prev => [...prev, ...assets]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Listings</h1>
            <p className="text-slate-500 mt-1">Manage your real estate properties and edits.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center justify-center shadow-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Listing
          </button>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                 {[1,2,3].map(i => (
                     <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
                 ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="text-slate-400 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125-1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-700">No listings yet</h3>
                        <p className="text-slate-500 text-sm">Create a new listing to start editing photos.</p>
                    </div>
                ) : (
                    listings.map(listing => (
                        <div 
                            key={listing.id} 
                            onClick={() => onSelectListing(listing)}
                            className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer relative"
                        >
                            {/* Thumbnail */}
                            <div className="h-48 bg-slate-100 relative overflow-hidden">
                                {listing.thumbnail ? (
                                    <img src={listing.thumbnail} alt={listing.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-slate-800 line-clamp-1">{listing.title}</h3>
                                        <div className="flex items-center text-slate-500 text-xs mt-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                            </svg>
                                            {listing.address || 'No address'}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">{listing.assets.length} Photos</span>
                                    <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Actions (Hover) */}
                            <button 
                                onClick={(e) => handleDelete(e, listing.id)}
                                className="absolute top-2 right-2 p-2 bg-white/90 text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                title="Delete Listing"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* New Listing Modal */}
        {showModal && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800">Create New Listing</h2>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Listing Title</label>
                                <input 
                                    type="text" 
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. 123 Maple Street"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Address (Optional)</label>
                                <input 
                                    type="text" 
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    placeholder="City, State, Zip"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                />
                            </div>
                            
                            <div className="pt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Photos</label>
                                <div className="h-48">
                                    <UploadSection onUpload={handleInitialUpload} compact={true} />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {newAssets.map((asset, idx) => (
                                        <div key={idx} className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden relative">
                                            <img src={asset.currentUrl} alt="preview" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {newAssets.length > 0 && (
                                        <div className="flex items-center justify-center w-16 h-16 bg-slate-100 rounded-lg text-xs text-slate-500">
                                            +{newAssets.length}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                        <button 
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleCreate}
                            disabled={!newTitle || isCreating}
                            className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center"
                        >
                            {isCreating && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            Create Listing
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ListingManager;