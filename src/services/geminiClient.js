/**
 * Gemini Client — Singleton Gemini API wrapper
 * Handles model initialization, JSON mode, API key validation,
 * client-side rate limiting, input sanitization, and dynamic fallbacks.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum characters allowed in a single prompt (≈ 50 k tokens safety cap). */
const MAX_PROMPT_LENGTH = 50_000;

/** Maximum API calls allowed per sliding window. */
const RATE_LIMIT_MAX_CALLS = 10;

/** Sliding window duration in milliseconds (1 minute). */
const RATE_LIMIT_WINDOW_MS = 60_000;

// ─── API Key Validation ───────────────────────────────────────────────────────

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

/**
 * Returns true only for well-formed Google AI Studio API keys.
 * Valid keys start with "AIzaSy" and are at least 35 characters long.
 * @param {string} key
 * @returns {boolean}
 */
export function isValidGeminiKey(key) {
  return typeof key === 'string' && key.startsWith('AIzaSy') && key.length >= 35;
}

if (!API_KEY) {
  console.info('[Synapse Law] VITE_GEMINI_API_KEY is not set. Intelligent local legal analysis engine is active.');
} else if (!isValidGeminiKey(API_KEY)) {
  console.warn(
    `[Synapse Law] VITE_GEMINI_API_KEY is set but does not match standard Gemini API key format ` +
    `(Google AI Studio keys start with 'AIzaSy...'). ` +
    `Live API calls may fail and fall back to local AI analysis.`
  );
}

// ─── Singleton AI Instance ────────────────────────────────────────────────────

let genAI = null;

/** Lazily initialises the GoogleGenerativeAI singleton. */
function getGenAI() {
  if (!genAI && API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
}

// ─── Safety Settings ──────────────────────────────────────────────────────────

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ─── Client-Side Rate Limiter ─────────────────────────────────────────────────

/**
 * Sliding-window call timestamps for rate limiting.
 * We never store any PII or prompt content here — only millisecond timestamps.
 * @type {number[]}
 */
const _callTimestamps = [];

/**
 * Returns true if the current call is within the allowed rate limit.
 * Mutates `_callTimestamps` to evict stale entries and register the new call.
 * @returns {boolean}
 */
function checkRateLimit() {
  const now = Date.now();
  // Evict timestamps outside the sliding window
  while (_callTimestamps.length > 0 && now - _callTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
    _callTimestamps.shift();
  }
  if (_callTimestamps.length >= RATE_LIMIT_MAX_CALLS) {
    return false;
  }
  _callTimestamps.push(now);
  return true;
}

/**
 * Returns how many seconds until the oldest call in the window expires.
 * Useful for user-facing "try again in X seconds" messages.
 * @returns {number}
 */
export function getRateLimitResetSeconds() {
  if (_callTimestamps.length === 0) return 0;
  const oldest = _callTimestamps[0];
  return Math.max(0, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - Date.now()) / 1000));
}

// ─── Input Sanitization ───────────────────────────────────────────────────────

/**
 * Strips null bytes and control characters from a prompt string, and enforces
 * the maximum length cap. Does NOT redact PII — that is handled upstream by
 * `piiSanitizer.js` before this function is ever called.
 * @param {string} prompt
 * @returns {string}
 */
function sanitizePrompt(prompt) {
  if (typeof prompt !== 'string') return '';
  // Remove null bytes and non-printable ASCII control characters (except newlines/tabs)
  return prompt
    .replace(/\u0000/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, MAX_PROMPT_LENGTH);
}

// ─── JSON Parsing Helper ──────────────────────────────────────────────────────

/**
 * Attempts to parse a raw model response string as JSON.
 * Falls back to extracting a fenced code block before throwing.
 * @param {string} text
 * @returns {Object}
 */
function parseModelJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    throw new Error('Model returned non-JSON content');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a structured JSON response from Gemini 1.5 Pro.
 * Applies rate limiting, prompt sanitization, and safe error handling.
 *
 * @param {string} prompt — The instruction prompt (PII must be pre-scrubbed by caller).
 * @param {Object|Function|null} fallback — Value returned (or function called) on failure.
 * @returns {Promise<Object>}
 * @throws {Error} Only when no fallback is provided and the call fails.
 */
export async function generateJSON(prompt, fallback = null) {
  try {
    const ai = getGenAI();
    if (!ai) throw new Error('No API key configured');

    if (!checkRateLimit()) {
      const resetIn = getRateLimitResetSeconds();
      throw new Error(`Rate limit reached. Please wait ${resetIn} second(s) before making another request.`);
    }

    const cleanPrompt = sanitizePrompt(prompt);

    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
      safetySettings: SAFETY_SETTINGS,
    });

    const result = await model.generateContent(cleanPrompt);
    const text = result.response.text();
    return parseModelJSON(text);
  } catch (error) {
    // Log a sanitised error message — never the full stack trace in production
    console.warn('[Synapse Law] Gemini API notice:', error.message || 'Unknown error');
    if (typeof fallback === 'function') return fallback();
    if (fallback !== null) return fallback;
    throw new Error('Analysis service temporarily unavailable. Please try again.');
  }
}

/**
 * Generates a response using Gemini Vision (multimodal — for image inputs).
 * Applies rate limiting and safe error handling.
 *
 * @param {string} textPrompt
 * @param {string} base64Image — Raw base64 image data (no data-URI prefix).
 * @param {string} mimeType — e.g. 'image/png'
 * @param {Object|Function|null} fallback
 * @returns {Promise<Object>}
 */
export async function generateVisionJSON(textPrompt, base64Image, mimeType, fallback = null) {
  try {
    const ai = getGenAI();
    if (!ai) throw new Error('No API key configured');

    if (!checkRateLimit()) {
      const resetIn = getRateLimitResetSeconds();
      throw new Error(`Rate limit reached. Please wait ${resetIn} second(s).`);
    }

    const cleanPrompt = sanitizePrompt(textPrompt);

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
      cleanPrompt,
      { inlineData: { data: base64Image, mimeType } },
    ]);

    const text = result.response.text();
    return parseModelJSON(text);
  } catch (error) {
    console.warn('[Synapse Law] Gemini Vision API notice:', error.message || 'Unknown error');
    if (typeof fallback === 'function') return fallback();
    if (fallback !== null) return fallback;
    throw new Error('Vision analysis service temporarily unavailable.');
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
 * Returns diagnostic API key status info. Never exposes the full key.
 * @returns {{ status: string, message: string, keyPreview?: string }}
 */
export function getAPIKeyInfo() {
  if (!API_KEY) return { status: 'missing', message: 'No API key set in .env' };
  if (!isValidGeminiKey(API_KEY)) {
    return {
      status: 'invalid_format',
      message: 'Key format is invalid. Google AI Studio keys start with "AIzaSy...".',
      keyPreview: `${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}`,
    };
  }
  return {
    status: 'configured',
    message: 'Valid Gemini API key configured.',
    keyPreview: `${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}`,
  };
}
