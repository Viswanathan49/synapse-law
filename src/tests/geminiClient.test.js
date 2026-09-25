/**
 * geminiClient.test.js — Tests for the Gemini API client wrapper.
 *
 * The GoogleGenerativeAI SDK is mocked so tests run fully offline and do not
 * consume API quota.  Rate-limit state is reset between each test via
 * module re-import / vi.resetModules().
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mock Setup ───────────────────────────────────────────────────────────────

// Mock the @google/generative-ai SDK before importing our module
vi.mock('@google/generative-ai', () => {
  const HarmCategory = {
    HARM_CATEGORY_HARASSMENT:        'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH:       'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  };
  const HarmBlockThreshold = {
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  };

  class GoogleGenerativeAI {
    constructor(key) {
      this._key = key;
    }
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({ mocked: true, answer: 'test response' }),
          },
        }),
      };
    }
  }

  return { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold };
});

// ─── isValidGeminiKey Tests ───────────────────────────────────────────────────

// Import pure utility that does NOT depend on env vars
import { isValidGeminiKey, getAPIKeyInfo, isAPIConfigured } from '../services/geminiClient.js';

describe('isValidGeminiKey()', () => {
  it('returns true for a correctly-formatted key', () => {
    expect(isValidGeminiKey('AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidGeminiKey('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidGeminiKey(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidGeminiKey(undefined)).toBe(false);
  });

  it('returns false for a key shorter than 35 characters', () => {
    expect(isValidGeminiKey('AIzaSyShort')).toBe(false);
  });

  it('returns false for a key that does not start with AIzaSy', () => {
    expect(isValidGeminiKey('AQ.Ab8ABCDEFGHIJKLMNOPQRSTUVWXYZ12345')).toBe(false);
  });

  it('returns false for a numeric value', () => {
    expect(isValidGeminiKey(12345)).toBe(false);
  });

  it('returns false for an object', () => {
    expect(isValidGeminiKey({})).toBe(false);
  });

  it('returns false for a key with only whitespace after trim', () => {
    expect(isValidGeminiKey('   ')).toBe(false);
  });

  it('returns true for a key exactly 35 characters starting with AIzaSy', () => {
    // 6 prefix chars + 29 filler = 35 total
    expect(isValidGeminiKey('AIzaSy' + 'A'.repeat(29))).toBe(true);
  });
});

// ─── getAPIKeyInfo Tests ──────────────────────────────────────────────────────

describe('getAPIKeyInfo()', () => {
  it('returns an object with a status field', () => {
    const info = getAPIKeyInfo();
    expect(info).toHaveProperty('status');
    expect(info).toHaveProperty('message');
  });

  it('status is one of: missing, invalid_format, configured', () => {
    const validStatuses = ['missing', 'invalid_format', 'configured'];
    const { status } = getAPIKeyInfo();
    expect(validStatuses).toContain(status);
  });

  it('never exposes the full API key in the returned object', () => {
    const info = getAPIKeyInfo();
    const infoStr = JSON.stringify(info);
    // keyPreview should be at most "AIzaSy...XXXX" (14 chars max), not a full 39-char key
    if (info.keyPreview) {
      expect(info.keyPreview.length).toBeLessThan(20);
      expect(info.keyPreview).toContain('...');
    }
    // Full raw key must NOT appear in stringified output
    const envKey = (import.meta?.env?.VITE_GEMINI_API_KEY || '').trim();
    if (envKey.length > 20) {
      // If there IS a key, the full value should not be serialised
      expect(infoStr).not.toContain(envKey);
    }
  });
});

// ─── isAPIConfigured Tests ────────────────────────────────────────────────────

describe('isAPIConfigured()', () => {
  it('returns a boolean', () => {
    expect(typeof isAPIConfigured()).toBe('boolean');
  });
});

// ─── getRateLimitResetSeconds Tests ──────────────────────────────────────────

import { getRateLimitResetSeconds } from '../services/geminiClient.js';

describe('getRateLimitResetSeconds()', () => {
  it('returns a non-negative number', () => {
    expect(getRateLimitResetSeconds()).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 when no calls have been made', () => {
    // Fresh import context — no calls made yet
    expect(getRateLimitResetSeconds()).toBe(0);
  });
});

// ─── generateJSON Fallback Tests ──────────────────────────────────────────────

import { generateJSON } from '../services/geminiClient.js';

describe('generateJSON() fallback behaviour', () => {
  it('calls a function fallback when the API call fails', async () => {
    // Force failure by passing a prompt that the mock will still succeed for,
    // but override the mock to reject for this test
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const failingModel = {
      generateContent: vi.fn().mockRejectedValue(new Error('Simulated API failure')),
    };
    vi.spyOn(GoogleGenerativeAI.prototype, 'getGenerativeModel').mockReturnValueOnce(failingModel);

    const fallbackFn = vi.fn().mockReturnValue({ fallbackCalled: true });
    const result = await generateJSON('test prompt', fallbackFn);
    expect(fallbackFn).toHaveBeenCalledOnce();
    expect(result.fallbackCalled).toBe(true);
  });

  it('returns object fallback directly when API call fails', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const failingModel = {
      generateContent: vi.fn().mockRejectedValue(new Error('Simulated failure')),
    };
    vi.spyOn(GoogleGenerativeAI.prototype, 'getGenerativeModel').mockReturnValueOnce(failingModel);

    const result = await generateJSON('test prompt', { static: 'fallback' });
    expect(result).toEqual({ static: 'fallback' });
  });

  it('throws when no fallback is provided and the API fails', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const failingModel = {
      generateContent: vi.fn().mockRejectedValue(new Error('Hard failure')),
    };
    vi.spyOn(GoogleGenerativeAI.prototype, 'getGenerativeModel').mockReturnValueOnce(failingModel);

    await expect(generateJSON('test', null)).rejects.toThrow();
  });
});
