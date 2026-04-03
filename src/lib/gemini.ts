import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function withRetry<T>(fn: (attempt: number) => Promise<T>, assetId: string, maxRetries = 10, initialDelay = 5000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn(i);
    } catch (error: any) {
      lastError = error;
      const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
      const isTransient = errorStr.includes('503') || 
                          errorStr.includes('429') || 
                          errorStr.includes('high demand') ||
                          errorStr.includes('UNAVAILABLE') ||
                          error.message?.includes('503') ||
                          error.message?.includes('high demand') ||
                          error.message?.includes('UNAVAILABLE');
      
      if (!isTransient || i === maxRetries - 1) {
        console.error(`[Final Error] for ${assetId}:`, error);
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(initialDelay * Math.pow(2, i), 60000) + (Math.random() * 2000);
      console.warn(`[Retry ${i + 1}/${maxRetries}] for ${assetId} after ${Math.round(delay)}ms due to transient error: ${error.message || '503/429'}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export async function generateImageAsset(asset: any, prompt: string, options?: { styleLock?: { data: string, mimeType: string }[], preset?: 'draft' | 'production' | 'premium' }) {
  const preset = options?.preset || 'production';
  // Model Routing
  let primaryModel = asset.model_id || 'gemini-3.1-flash-image-preview';
  if (preset === 'draft') primaryModel = 'gemini-3-flash-preview';
  if (preset === 'premium' && (asset.category === 'brand' || asset.id === 'board-master')) primaryModel = 'gemini-3.1-pro-preview';
  
  const fallbackModel = 'gemini-2.5-flash-image';
  
  // Image Size
  let imageSize: "512px" | "1K" | "2K" | "4K" = "512px";
  if (preset === 'production') {
    imageSize = (asset.category === 'brand' || asset.id === 'board-master') ? "1K" : "512px";
  } else if (preset === 'premium') {
    imageSize = (asset.category === 'brand' || asset.id === 'board-master') ? "2K" : "1K";
  }

  return withRetry(async (attempt) => {
    // If we've failed 5 times, try the fallback model
    const currentModel = (attempt >= 5 && primaryModel !== fallbackModel) ? fallbackModel : primaryModel;
    
    if (attempt >= 5 && primaryModel !== fallbackModel) {
      console.info(`[Fallback] Switching to ${fallbackModel} for ${asset.id} after ${attempt} failed attempts.`);
    }

    const parts: any[] = [{ text: prompt }];
    if (options?.styleLock && options.styleLock.length > 0) {
      options.styleLock.forEach(lock => {
        parts.push({ inlineData: { data: lock.data, mimeType: lock.mimeType } });
      });
      parts.push({ text: "Use the provided images as a strict style reference for the new asset. Maintain the same color palette, lighting, and stained-glass aesthetic." });
    }

    const response = await ai.models.generateContent({
      model: currentModel,
      contents: [{ parts }],
      config: {
        imageConfig: {
          aspectRatio: asset.category === 'brand' || asset.id === 'board-master' ? "16:9" : "1:1",
          imageSize: imageSize as any
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data; // base64 string
      }
    }
    throw new Error("No image data returned from model");
  }, asset.id);
}

export async function generateMusicAsset(asset: any, prompt: string) {
  const modelId = asset.model_id || 'lyria-3-clip-preview';
  
  return withRetry(async () => {
    const response = await ai.models.generateContentStream({
      model: modelId,
      contents: prompt,
      config: {
        responseModalities: [Modality.AUDIO]
      }
    });

    let audioBase64 = "";
    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          audioBase64 += part.inlineData.data;
        }
      }
    }

    if (!audioBase64) throw new Error("No audio data returned from Lyria");
    return audioBase64;
  }, asset.id);
}

export async function generateVoiceAsset(asset: any, prompt: string) {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No voice data returned from Gemini TTS");
    return base64Audio;
  }, asset.id);
}

export async function generateSFXAsset(asset: any, prompt: string) {
  const modelId = 'lyria-3-clip-preview';
  
  return withRetry(async () => {
    const response = await ai.models.generateContentStream({
      model: modelId,
      contents: `Generate a high-quality sound effect for: ${prompt}. The sound should be cinematic and fit a fantasy game.`,
      config: {
        responseModalities: [Modality.AUDIO]
      }
    });

    let audioBase64 = "";
    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          audioBase64 += part.inlineData.data;
        }
      }
    }

    if (!audioBase64) throw new Error("No SFX data returned from Lyria");
    return audioBase64;
  }, asset.id);
}
