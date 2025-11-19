
import { ImageAsset, ExportData } from './types';

/**
 * Export Hooks
 * Prepares data for backend persistence (Replit/Supabase/Firebase).
 */

export const exportEditPlan = (asset: ImageAsset): ExportData => {
    return {
        assetId: asset.id,
        timestamp: new Date().toISOString(),
        edits: asset.editLog,
        finalImage: asset.currentUrl, // In prod, upload this to blob storage and return URL
        complianceSigned: true // Assumption for MVP
    };
};

export const exportAnalysis = (asset: ImageAsset) => {
    return {
        assetId: asset.id,
        analysis: asset.analysis
    };
};

export const exportHistoryLog = (asset: ImageAsset) => {
    // Used for "audit trail" feature in MLS compliance
    return asset.editLog.map((entry, index) => ({
        step: index,
        action: entry,
        timestamp: new Date().toISOString()
    }));
};
