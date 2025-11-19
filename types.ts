export enum ModelNames {
  REASONING = 'gemini-3-pro-preview',
  VISION = 'gemini-3-pro-preview',
  EDITING = 'gemini-2.5-flash-image',
  VIDEO = 'veo-3.1-fast-generate-preview',
  VIDEO_HQ = 'veo-3.1-generate-preview',
  GENERATION = 'imagen-4.0-generate-001'
}

export interface UserProfile {
    credits: number;
    plan: 'FREE' | 'PRO';
}

export interface AnalysisResult {
  roomType: string;
  qualityScore: number;
  lighting: string;
  clutterLevel: 'Low' | 'Medium' | 'High';
  complianceIssues: string[];
  marketingDescription: string;
  suggestedEdits: string[];
}

export interface ImageAsset {
  id: string;
  originalUrl: string; 
  currentUrl: string; 
  history: string[]; 
  analysis?: AnalysisResult;
  filename: string;
  mimeType: string;
  editLog: string[];
  selected?: boolean; 
}

export enum WorkflowType {
  MLS_CLEAN = 'MLS_CLEAN',
  LUXURY_ENHANCE = 'LUXURY_ENHANCE',
  TWILIGHT = 'TWILIGHT',
  DECLUTTER = 'DECLUTTER',
  PRO_CLEAN_SWEEP = 'PRO_CLEAN_SWEEP',
  MASK_INPAINT = 'MASK_INPAINT',
  OBJECT_REMOVE = 'OBJECT_REMOVE', 
  OBJECT_KEEP = 'OBJECT_KEEP',
  STAGING = 'STAGING',
  STYLE_TRANSFER = 'STYLE_TRANSFER',
  SKY_REPLACEMENT = 'SKY_REPLACEMENT',
  HDR_MERGE = 'HDR_MERGE',
  CUSTOM = 'CUSTOM',
  BATCH_EDIT = 'BATCH_EDIT',
  EXTERIOR_SIDING = 'EXTERIOR_SIDING',
  BACKYARD_LANDSCAPING = 'BACKYARD_LANDSCAPING'
}

export enum MaskMode {
  REMOVE = 'REMOVE',
  KEEP = 'KEEP',
  REPLACE = 'REPLACE'
}

export enum SelectionMode {
  NONE = 'NONE',
  REMOVE = 'REMOVE',
  KEEP = 'KEEP'
}

export enum SceneType {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR'
}

export enum AspectRatio {
  MLS_3_2 = '3:2',
  SOCIAL_9_16 = '9:16',
  INSTAGRAM_4_5 = '4:5',
  SQUARE_1_1 = '1:1',
  LANDSCAPE_16_9 = '16:9'
}

export const CLUTTER_CATEGORIES = [
  "Cables & Wires",
  "Personal Photos",
  "Trash bins",
  "Pet Items",
  "Vehicles",
  "Kitchen Counter Items",
  "Toiletries"
];

export interface ColorSettings {
  walls: string | null;
  floors: string | null;
  cabinets: string | null;
  siding?: string | null;
}

export interface ProcessingState {
  isProcessing: boolean;
  statusMessage: string;
  progress: number;
  step?: 'planning' | 'editing' | 'finalizing' | 'animating';
  currentBatchIndex?: number;
  totalBatchCount?: number;
}

export enum QualityMode {
  SPEED = 'SPEED',   
  QUALITY = 'QUALITY' 
}

export interface WorkflowConfig {
  type: WorkflowType;
  isStrictMode: boolean;
  qualityMode: QualityMode;
  options?: {
    promptOverride?: string;
    clutterCategories?: string[];
    colors?: ColorSettings;
    referenceStyleUrl?: string;
    targetAspectRatio?: AspectRatio | string;
    keepFurniture?: boolean;
    maskUrl?: string;
    maskMode?: MaskMode;
    replacePrompt?: string;
    clickCoords?: { x: number; y: number };
    stagingItem?: string;
    stagingStyle?: string;
    landscapingStyle?: string;
    batchOperation?: WorkflowType;
  };
}

export interface EditPlan {
  allowed: boolean;
  reasoning: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
  auxiliaryImages?: { data: string; mimeType: string }[]; 
}

export interface AnimationConfig {
  template: 'PAN' | 'REVEAL' | 'REEL';
}

export enum RiskLevel {
  LEGAL = "LEGAL",
  RISKY = "RISKY",
  ILLEGAL = "ILLEGAL"
}

export interface ValidationResult {
  isAllowed: boolean;
  riskLevel: RiskLevel;
  warnings: string[];
  reason?: string;
}

export interface ExportData {
  assetId: string;
  timestamp: string;
  edits: string[];
  finalImage: string; 
  complianceSigned: boolean;
}