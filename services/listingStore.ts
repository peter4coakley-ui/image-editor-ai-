import { ImageAsset } from '../types';

export interface Listing {
  id: string;
  title: string;
  address?: string;
  assets: ImageAsset[];
  createdAt: string;
  thumbnail?: string;
}

const STORAGE_KEY = 'realtor_suite_listings';
const DB_DELAY = 300; // Simulated latency

// --- Persistence Helper ---
const loadFromStorage = (): Listing[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load listings", e);
        return [];
    }
};

const saveToStorage = (listings: Listing[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
    } catch (e) {
        console.error("Failed to save listings (quota exceeded?)", e);
    }
};

// Initialize from storage
let listings: Listing[] = loadFromStorage();

// Add demo listing if empty
if (listings.length === 0) {
    listings = [{
        id: 'demo-listing-1',
        title: '123 Maple Street (Demo)',
        address: 'Beverly Hills, CA 90210',
        assets: [], 
        createdAt: new Date().toISOString(),
    }];
    saveToStorage(listings);
}

const delay = () => new Promise(res => setTimeout(res, DB_DELAY));

export const getAllListings = async (): Promise<Listing[]> => {
  await delay();
  // Reload from storage to ensure sync in multi-tab scenarios
  listings = loadFromStorage();
  return [...listings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getListingById = async (id: string): Promise<Listing | undefined> => {
  await delay();
  listings = loadFromStorage();
  return listings.find(l => l.id === id);
};

export const createListing = async (data: { title: string; address?: string; assets?: ImageAsset[] }): Promise<Listing> => {
  await delay();
  listings = loadFromStorage();
  
  const newListing: Listing = {
    id: Math.random().toString(36).substring(2, 10),
    title: data.title || 'Untitled Listing',
    address: data.address || '',
    assets: data.assets || [],
    createdAt: new Date().toISOString(),
    thumbnail: data.assets && data.assets.length > 0 ? data.assets[0].currentUrl : undefined
  };
  
  listings = [newListing, ...listings];
  saveToStorage(listings);
  return newListing;
};

export const deleteListing = async (id: string): Promise<void> => {
  await delay();
  listings = loadFromStorage();
  listings = listings.filter(l => l.id !== id);
  saveToStorage(listings);
};

export const updateListing = async (id: string, updates: Partial<Listing>): Promise<Listing | undefined> => {
  // Note: We typically don't await delay here for rapid UI updates like "adding a photo", 
  // but in a strict backend model we would. 
  // For this production-ready simulation, we will save synchronously to storage but return a promise.
  
  listings = loadFromStorage();
  const index = listings.findIndex(l => l.id === id);
  if (index !== -1) {
    // Thumbnail logic
    let thumbnail = listings[index].thumbnail;
    if (updates.assets) {
        if (updates.assets.length > 0 && !thumbnail) {
            thumbnail = updates.assets[0].currentUrl;
        } else if (updates.assets.length === 0) {
            thumbnail = undefined;
        } else if (thumbnail && !updates.assets.find(a => a.currentUrl === thumbnail)) {
            thumbnail = updates.assets[0].currentUrl;
        }
    }

    listings[index] = { 
        ...listings[index], 
        ...updates,
        thumbnail: thumbnail !== undefined ? thumbnail : listings[index].thumbnail
    };
    
    saveToStorage(listings);
    return listings[index];
  }
  return undefined;
};