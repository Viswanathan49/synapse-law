/**
 * Gemini Client — Singleton Gemini API wrapper
 * Handles model initialization, JSON mode, API key validation, and dynamic fallbacks.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

export function isValidGeminiKey(key) {
  return typeof key === 'string' && key.startsWith('AIzaSy') && key.length >= 35;
}

if (!API_KEY) {
  console.info('[LexiGuard] VITE_GEMINI_API_KEY is not set. Intelligent local legal analysis engine is active.');
} else if (!isValidGeminiKey(API_KEY)) {
  console.warn(
    `[LexiGuard] VITE_GEMINI_API_KEY is set but does not match standard Gemini API key format (Google AI Studio keys start with 'AIzaSy...'). ` +
    `Live API calls may fail and fall back to local AI analysis.`
  );
}

let genAI = null;

function getGenAI() {
  if (!genAI && API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Generates a structured JSON response from Gemini 1.5 Pro.
 * @param {string} prompt
 * @param {Object|Function} fallback — Returned or called if API fails
 * @returns {Promise<Object>}
 */
export async function generateJSON(prompt, fallback = null) {
  try {
    const ai = getGenAI();
    if (!ai) throw new Error('No API key configured');

    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
      safetySettings: SAFETY_SETTINGS,
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);
      throw new Error('Failed to parse JSON response');
    }
  } catch (error) {
    console.warn('[LexiGuard] Gemini API live call notice:', error.message || error);
    if (typeof fallback === 'function') return fallback();
    if (fallback !== null) return fallback;
    throw error;
  }
}

/**
 * Generates a response using Gemini Vision (multimodal — for images).
 * @param {string} textPrompt
 * @param {string} base64Image
 * @param {string} mimeType
 * @param {Object|Function} fallback
 * @returns {Promise<Object>}
 */
export async function generateVisionJSON(textPrompt, base64Image, mimeType, fallback = null) {
  try {
    const ai = getGenAI();
    if (!ai) throw new Error('No API key configured');

    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
      safetySettings: SAFETY_SETTINGS,
    });

    const result = await model.generateContent([
      textPrompt,
      { inlineData: { data: base64Image, mimeType } },
    ]);

    const text = result.response.text();

    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);
      throw new Error('Failed to parse vision JSON response');
    }
  } catch (error) {
    console.warn('[LexiGuard] Gemini Vision API notice:', error.message || error);
    if (typeof fallback === 'function') return fallback();
    if (fallback !== null) return fallback;
    throw error;
  }
}

/**
 * Checks if a valid API key is configured.
 * @returns {boolean}
 */
export function isAPIConfigured() {
  return isValidGeminiKey(API_KEY);
}

/**
 * Returns raw API key status info for diagnostics.
 */
export function getAPIKeyInfo() {
  if (!API_KEY) return { status: 'missing', message: 'No API key set in .env' };
  if (!isValidGeminiKey(API_KEY)) {
    return {
      status: 'invalid_format',
      message: 'Key format is invalid. Google AI Studio keys start with "AIzaSy...".',
      keyPreview: `${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}`
    };
  }
  return {
    status: 'configured',
    message: 'Valid Gemini API key configured.',
    keyPreview: `${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}`
  };
}
