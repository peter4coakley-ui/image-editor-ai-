import { 
    WorkflowConfig, 
    WorkflowType, 
    EditPlan, 
    ImageAsset, 
    ModelNames, 
    AnalysisResult,
    AnimationConfig,
    QualityMode,
    RiskLevel,
    MaskMode
} from './types';
import * as geminiService from './services/geminiService';
import { getMimeType } from './utils';
import { perfManager } from './performanceManager';
import { validate } from './mlsValidator';
import * as userStore from './services/userStore';

/**
 * 1. PLAN EDITS
 */
export const planEdits = async (
    asset: ImageAsset,
    config: WorkflowConfig
): Promise<{ plan: EditPlan; warnings: string[] }> => {
    
    // CREDIT CHECK
    const cost = userStore.getCostForWorkflow(config.type);
    const user = userStore.getUserProfile();
    if (user.credits < cost) {
        throw new Error(`Insufficient credits. This action requires ${cost} credits, but you have ${user.credits}.`);
    }

    // If this is a BATCH_EDIT wrapper, unwrap the inner operation for planning
    const effectiveType = config.type === WorkflowType.BATCH_EDIT && config.options?.batchOperation 
        ? config.options.batchOperation 
        : config.type;

    const { isStrictMode, qualityMode, options } = config;
    const roomType = asset.analysis?.roomType || "room";

    let basePrompt = "";
    let systemInstruction = isStrictMode 
        ? "You are an expert real estate photo editor. Maintain structural integrity. Never invent new structures, windows, doors, or furniture. Only clean, brighten, and correct. Keep it photorealistic."
        : "You are a creative interior designer. Make the room look amazing. Never invent new structures, windows, or doors unless explicitly asked. Keep it photorealistic.";

    const auxImages: { data: string, mimeType: string }[] = [];

    switch (effectiveType) {
        case WorkflowType.MLS_CLEAN:
            basePrompt = `Fix white balance, correct vertical lines, remove lens dust, reduce noise, ensure even lighting for this ${roomType}.`;
            break;
        case WorkflowType.PRO_CLEAN_SWEEP:
            const keepFurn = options?.keepFurniture !== false; // default true
            systemInstruction += " Never remove structural elements like pillars, vents, outlets, or built-in cabinets.";
            if (keepFurn) {
                basePrompt = `Remove all non-essential clutter from this ${roomType}. Remove garbage, pet items, toys, loose papers, cables, magnets on fridge, and countertop items. Keep all furniture, lamps, and rugs. Inpaint background naturally.`;
            } else {
                basePrompt = `Empty this ${roomType} completely. Remove all furniture, rugs, artwork, and decor. Keep only built-in cabinets, kitchen islands, bathroom vanities, and fireplaces. Reveal the floor and walls cleanly.`;
            }
            break;
        case WorkflowType.MASK_INPAINT:
            if (!options?.maskUrl) throw new Error("Mask required for inpainting.");
            auxImages.push({ data: options.maskUrl, mimeType: 'image/png' });
            
            const mode = options.maskMode || MaskMode.REMOVE;
            systemInstruction = "You are an advanced inpainting editor. Follow the mask strictly. Never alter areas outside the mask unless instructed otherwise. Never hallucinate structures.";
            
            if (mode === MaskMode.REMOVE) {
                basePrompt = "Remove the masked object. Seamlessly inpaint using the surrounding context (floor, wall, etc). Preserve all structural elements.";
            } else if (mode === MaskMode.KEEP) {
                basePrompt = "Remove EVERYTHING in the image EXCEPT what is inside the mask. Replace the background with a clean, neutral renovation-ready look or empty room style.";
            } else if (mode === MaskMode.REPLACE) {
                basePrompt = `Replace the masked region with: ${options.replacePrompt || 'something matching the style'}. Match lighting and perspective perfectly.`;
            }
            break;
        case WorkflowType.LUXURY_ENHANCE:
            basePrompt = `Enhance this ${roomType} for a luxury listing. Increase dynamic range (HDR), clarity, and vibrance. Make the view out the windows clear.`;
            break;
        case WorkflowType.TWILIGHT:
            basePrompt = `Convert this exterior shot to a twilight/dusk scene. Deep blue sky, warm glowing interior lights, garden lighting on.`;
            break;
        case WorkflowType.DECLUTTER:
            const items = options?.clutterCategories?.join(", ") || "clutter";
            basePrompt = `Remove ${items} from this ${roomType}. Inpaint the background naturally to match the surroundings. Keep main furniture.`;
            break;
        case WorkflowType.SKY_REPLACEMENT:
            basePrompt = "Replace the sky with a beautiful, realistic blue sky with soft white clouds. Adjust lighting on the building to match.";
            break;
        case WorkflowType.CUSTOM:
            if (options?.colors) {
                if (options.colors.walls) basePrompt += `Paint walls ${options.colors.walls}. `;
                if (options.colors.floors) basePrompt += `Change flooring to ${options.colors.floors}. `;
                if (options.colors.cabinets) basePrompt += `Paint cabinets ${options.colors.cabinets}. `;
            }
            if (options?.promptOverride) {
                basePrompt += options.promptOverride;
            }
            break;
        case WorkflowType.STAGING:
            if (options?.stagingItem) {
                basePrompt = `Add a photorealistic ${options.stagingItem} to this room. Place it naturally in the scene, matching perspective, lighting, and shadows of the existing room.`;
            } else if (options?.stagingStyle) {
                basePrompt = `Virtually stage this room in a ${options.stagingStyle} style. Fill the room with appropriate furniture, rugs, and decor matching this style. Ensure photorealism and correct perspective.`;
            } else {
                basePrompt = `Virtually stage this room with modern furniture.`;
            }
            break;
        case WorkflowType.EXTERIOR_SIDING:
            if (options?.colors?.siding) {
                basePrompt = `Change the exterior house siding to ${options.colors.siding}. Maintain all windows, doors, and roof exactly as they are. Adjust the texture and lighting to look photorealistic.`;
            } else {
                throw new Error("Siding material not specified.");
            }
            break;
        case WorkflowType.BACKYARD_LANDSCAPING:
            const landscapeStyle = options?.landscapingStyle || "modern";
            basePrompt = `Redesign this backyard landscaping in a ${landscapeStyle} style. Add fresh grass or patio pavers, clean up the garden beds, and add appropriate outdoor plants. Keep the main house structure and fencing intact.`;
            break;
        case WorkflowType.STYLE_TRANSFER:
            basePrompt = "Transfer the interior design style from the reference image to the source image. Match color palette, materials, and mood exactly.";
            if (options?.referenceStyleUrl) {
                auxImages.push({
                    data: options.referenceStyleUrl,
                    mimeType: getMimeType(options.referenceStyleUrl)
                });
            } else {
                 throw new Error("Missing reference image for style transfer.");
            }
            break;
        default:
            basePrompt = "Enhance image.";
    }

    let plan: EditPlan = {
        allowed: true,
        reasoning: "Approved",
        model: ModelNames.EDITING,
        systemInstruction,
        userPrompt: basePrompt,
        auxiliaryImages: auxImages
    };

    // VALIDATION
    const validation = validate({ ...config, type: effectiveType }, plan);
    if (!validation.isAllowed) {
        return {
            plan: { ...plan, allowed: false, reasoning: validation.reason || "Action blocked by MLS rules." },
            warnings: validation.warnings
        };
    }

    return { plan, warnings: validation.warnings };
};

/**
 * 2. APPLY EDITS
 */
export const applyEdits = async (
    asset: ImageAsset,
    plan: EditPlan
): Promise<string> => {
    if (!plan.allowed) {
        throw new Error(plan.reasoning);
    }

    const maskKey = plan.auxiliaryImages ? plan.auxiliaryImages.length : 0;
    const cacheKey = `edit_${asset.id}_${btoa(plan.userPrompt.substring(0, 50))}_${maskKey}`;

    return await perfManager.getCachedOrRun(cacheKey, async () => {
        const result = await geminiService.executeEdit(asset.currentUrl, asset.mimeType, plan);
        return result;
    });
};

/**
 * 3. BATCH WORKFLOW
 */
export const runBatchWorkflow = async (
    assets: ImageAsset[],
    config: WorkflowConfig,
    previewAsset: ImageAsset, 
    onProgress: (current: number, total: number) => void
): Promise<Map<string, string>> => {
    
    const cost = userStore.getCostForWorkflow(WorkflowType.BATCH_EDIT) + assets.length; // Base + 1 per image
    const user = userStore.getUserProfile();
    if (user.credits < cost) {
        throw new Error(`Batch requires ${cost} credits.`);
    }

    // 1. Plan
    const { plan, warnings } = await planEdits(previewAsset, config);
    
    if (!plan.allowed) {
        throw new Error(`Batch operation blocked: ${plan.reasoning}`);
    }

    // Deduct
    userStore.deductCredits(cost);

    const results = new Map<string, string>();
    let processedCount = 0;

    // 2. Process
    for (const asset of assets) {
        try {
            const newUrl = await applyEdits(asset, plan);
            results.set(asset.id, newUrl);
        } catch (e) {
            console.error(`Failed to process asset ${asset.id} in batch`, e);
        }
        
        processedCount++;
        onProgress(processedCount, assets.length);
    }

    return results;
};

/**
 * 4. HELPER: Object Selection Pipeline
 */
export const runObjectSelectionPipeline = async (
    asset: ImageAsset,
    config: WorkflowConfig,
    clickCoords: { x: number, y: number }
): Promise<{ newImageUrl: string, warnings: string[] }> => {
    
    const cost = 1;
    if (!userStore.deductCredits(cost)) {
        throw new Error("Insufficient credits");
    }

    const maskUrl = await perfManager.queueTask(() => 
        geminiService.generateObjectMask(asset.currentUrl, asset.mimeType, clickCoords)
    );

    const newConfig: WorkflowConfig = {
        ...config,
        type: WorkflowType.MASK_INPAINT,
        options: {
            ...config.options,
            maskUrl: maskUrl,
            maskMode: config.type === WorkflowType.OBJECT_REMOVE ? MaskMode.REMOVE : MaskMode.KEEP
        }
    };

    const { plan, warnings } = await planEdits(asset, newConfig);
    const newImageUrl = await applyEdits(asset, plan);

    return { newImageUrl, warnings };
};

/**
 * 5. ANALYZE
 */
export const runAnalysis = async (asset: ImageAsset): Promise<AnalysisResult> => {
    return await perfManager.getCachedOrRun(`analysis_${asset.id}`, () => 
        geminiService.analyzeImage(asset.currentUrl, asset.mimeType)
    );
};

/**
 * 6. ANIMATE (Video)
 */
export const runAnimation = async (asset: ImageAsset, config: AnimationConfig): Promise<string> => {
    const cost = userStore.getCostForWorkflow(ModelNames.VIDEO);
    if (!userStore.deductCredits(cost)) {
        throw new Error(`Video generation requires ${cost} credits.`);
    }

    return await perfManager.queueTask(() => 
        geminiService.generateListingVideo(asset.currentUrl, asset.mimeType, config.template)
    );
};