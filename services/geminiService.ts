
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResult, ModelNames, WorkflowType, ColorSettings, AspectRatio, EditPlan } from "../types";
import { extractBase64Data, getMimeType } from "../utils";

// REPLIT_BACKEND_ENDPOINT: In the future, these calls will be proxied through a backend.

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

// --- 1. Analysis Pipeline ---

export const analyzeImage = async (imageBase64: string, mimeType: string): Promise<AnalysisResult> => {
  const ai = getAI();
  
  const prompt = `
    Analyze this real estate image for an MLS listing.
    Identify the room type.
    Rate quality 0-100 (lighting, composition).
    Assess lighting (Natural, Artificial, Dark, HDR).
    Determine clutter level (Low, Medium, High).
    List MLS compliance issues (people, license plates, text overlays).
    Write a 1-sentence marketing description.
    Suggest 3 specific edits to improve value.
  `;

  try {
    const response = await ai.models.generateContent({
      model: ModelNames.VISION,
      contents: {
        parts: [
          { inlineData: { data: extractBase64Data(imageBase64), mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roomType: { type: Type.STRING },
            qualityScore: { type: Type.INTEGER },
            lighting: { type: Type.STRING },
            clutterLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            complianceIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
            marketingDescription: { type: Type.STRING },
            suggestedEdits: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["roomType", "qualityScore", "lighting", "clutterLevel", "complianceIssues", "marketingDescription"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("No analysis data returned");
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

// --- 2. Planning Pipeline (Gemini 3 Pro) ---

export const generateEditPlan = async (
    taskDescription: string, 
    isStrictMode: boolean, 
    currentAnalysis: AnalysisResult | undefined
): Promise<{ allowed: boolean; reasoning: string; technicalPrompt: string }> => {
    const ai = getAI();

    const prompt = `
        You are the logic core for a Real Estate Image Editor.
        TASK: Evaluate if the requested edit is allowed and generate the technical prompt.

        CONTEXT:
        - Request: ${taskDescription}
        - Strict Mode: ${isStrictMode ? "ON (Only cleanup allowed)" : "OFF (Creative allowed)"}
        - Room Type: ${currentAnalysis?.roomType || "Unknown"}
        
        OUTPUT JSON:
        - allowed: boolean
        - reasoning: string
        - technicalPrompt: string (Detailed prompt for the editing model)
    `;

    try {
        const response = await ai.models.generateContent({
            model: ModelNames.REASONING,
            contents: { text: prompt },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        allowed: { type: Type.BOOLEAN },
                        reasoning: { type: Type.STRING },
                        technicalPrompt: { type: Type.STRING }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("Failed to generate plan");
    } catch (error) {
        console.error("Planning failed:", error);
        return { 
            allowed: true, 
            reasoning: "Fallback execution", 
            technicalPrompt: taskDescription 
        };
    }
};

// --- 3. Execution Pipeline (Nano Banana / Imagen) ---

export const executeEdit = async (
  imageBase64: string, 
  mimeType: string, 
  plan: EditPlan
): Promise<string> => {
  const ai = getAI();

  const parts: any[] = [
     { inlineData: { data: extractBase64Data(imageBase64), mimeType } },
  ];

  // IMPORTANT: If mask is present, it must be the second part, before the text prompt.
  if (plan.auxiliaryImages) {
      plan.auxiliaryImages.forEach(img => {
          parts.push({ inlineData: { data: extractBase64Data(img.data), mimeType: img.mimeType } });
      });
  }

  parts.push({ text: plan.userPrompt });

  try {
    const response = await ai.models.generateContent({
      model: plan.model || ModelNames.EDITING, 
      contents: { parts },
      config: {
        systemInstruction: plan.systemInstruction,
        responseModalities: [Modality.IMAGE]
      }
    });

    const resParts = response.candidates?.[0]?.content?.parts;
    if (resParts && resParts[0]?.inlineData) {
      return `data:image/png;base64,${resParts[0].inlineData.data}`;
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Edit failed:", error);
    throw error;
  }
};

// --- 4. Object Segmentation (Mask Generation) ---

export const generateObjectMask = async (
  imageBase64: string, 
  mimeType: string, 
  coords: { x: number, y: number }
): Promise<string> => {
  const ai = getAI();
  
  const prompt = `
    Look at the object located at relative coordinates X=${coords.x.toFixed(2)}, Y=${coords.y.toFixed(2)} (where 0,0 is top-left and 1,1 is bottom-right).
    Generate a precise black-and-white segmentation mask for this object.
    The object should be pure WHITE. The background should be pure BLACK.
    Do not include any gray areas or text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: ModelNames.EDITING,
      contents: {
        parts: [
          { inlineData: { data: extractBase64Data(imageBase64), mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE]
      }
    });

    const resParts = response.candidates?.[0]?.content?.parts;
    if (resParts && resParts[0]?.inlineData) {
      return `data:image/png;base64,${resParts[0].inlineData.data}`;
    }
    throw new Error("Failed to generate object mask");
  } catch (error) {
    console.error("Mask generation failed:", error);
    throw error;
  }
};

// Backward compatibility
export const editImage = async (base64: string, mime: string, type: WorkflowType, options: any) => {
    return executeEdit(base64, mime, {
        allowed: true, 
        reasoning: "", 
        model: ModelNames.EDITING, 
        systemInstruction: "", 
        userPrompt: options.promptOverride || "Enhance"
    });
};

export const generateRealEstateImage = async (
  prompt: string,
  aspectRatio: string
): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateImages({
      model: ModelNames.GENERATION,
      prompt: `Real estate photography, photorealistic, high end, 4k. ${prompt}`,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio as any,
        outputMimeType: 'image/jpeg',
      }
    });

    const generatedImage = response.generatedImages?.[0]?.image;
    if (generatedImage && generatedImage.imageBytes) {
      return `data:image/jpeg;base64,${generatedImage.imageBytes}`;
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Generation failed:", error);
    throw error;
  }
};

// --- 5. Animation Pipeline (Veo) ---

export const generateListingVideo = async (
  imageBase64: string,
  mimeType: string,
  template: 'PAN' | 'REVEAL' | 'REEL'
): Promise<string> => {
  const ai = getAI();
  let prompt = "";
  let aspectRatio = '16:9';

  if (template === 'PAN') {
      prompt = "Cinematic slow pan across this real estate room, 4k, smooth motion, professional architectural videography.";
  } else if (template === 'REVEAL') {
      prompt = "Slow zoom in revealing the details of this luxury room, elegant motion, photorealistic.";
  } else if (template === 'REEL') {
      prompt = "Vertical video, slow smooth camera movement upwards showing the space from floor to ceiling, social media reel style.";
      aspectRatio = '9:16';
  }

  try {
    let operation = await ai.models.generateVideos({
      model: ModelNames.VIDEO,
      prompt: prompt,
      image: {
        imageBytes: extractBase64Data(imageBase64),
        mimeType: mimeType
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio as any
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
      const apiKey = process.env.API_KEY;
      const videoResponse = await fetch(`${videoUri}&key=${apiKey}`);
      const videoBlob = await videoResponse.blob();
      return URL.createObjectURL(videoBlob);
    }
    
    throw new Error("Video generation completed but URI missing");

  } catch (error) {
    console.error("Video generation failed:", error);
    throw error;
  }
};
