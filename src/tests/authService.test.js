/**
 * authService.test.js — Comprehensive tests for the Synapse Law authentication
 * and memory vault service.
 *
 * All localStorage interactions are mocked via a Map-backed fake implementation
 * so tests remain fully isolated and deterministic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authService } from '../services/authService.js';

// ─── localStorage Mock ────────────────────────────────────────────────────────

let store = {};

const localStorageMock = {
  getItem:    (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
  setItem:    (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear:      () => { store = {}; },
  get length() { return Object.keys(store).length; },
  key:        (i) => Object.keys(store)[i] ?? null,
};

// ─── Web Crypto Mock (for AES-GCM-256 encryption layer) ─────────────────────
// The auth service now encrypts all localStorage writes via crypto.subtle.
// In jsdom (test environment), we provide a passthrough mock so storage reads
// and writes still work, allowing all auth logic to be tested normally.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const cryptoMock = {
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = (i * 37 + 7) % 256;
    return arr;
  },
  subtle: {
    importKey: vi.fn(async () => ({ type: 'raw', mock: true })),
    deriveKey: vi.fn(async () => ({ type: 'derived', mock: true })),
    // Passthrough: "encrypt" just JSON-encodes plaintext as base64
    encrypt: vi.fn(async (_algo, _key, plaintext) => {
      return plaintext.buffer ?? plaintext;
    }),
    // Passthrough: "decrypt" just returns the raw plaintext bytes
    decrypt: vi.fn(async (_algo, _key, ciphertext) => {
      return ciphertext;
    }),
  },
};

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  store = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'crypto', {
    value: cryptoMock,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  store = {};
  vi.clearAllMocks();
});

// ─── getDemoUsers ─────────────────────────────────────────────────────────────

describe('getDemoUsers()', () => {
  it('returns an array with 3 demo users', () => {
    const users = authService.getDemoUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBe(3);
  });

  it('every demo user has id, name, email, role, company', () => {
    authService.getDemoUsers().forEach((u) => {
      expect(u).toHaveProperty('id');
      expect(u).toHaveProperty('name');
      expect(u).toHaveProperty('email');
      expect(u).toHaveProperty('role');
      expect(u).toHaveProperty('company');
    });
  });
});

// ─── getCurrentUser ───────────────────────────────────────────────────────────

describe('getCurrentUser()', () => {
  it('returns the first demo user when localStorage is empty', () => {
    const user = authService.getCurrentUser();
    expect(user.id).toBe('user_sarah_01');
  });

  it('returns the previously set user after setCurrentUser()', () => {
    const demo = authService.getDemoUsers()[1]; // Alex Mercer
    authService.setCurrentUser(demo);
    const current = authService.getCurrentUser();
    expect(current.id).toBe('user_alex_02');
    expect(current.name).toBe('Alex Mercer');
  });
});

// ─── login() ─────────────────────────────────────────────────────────────────

describe('login()', () => {
  it('succeeds for a known demo user email (case-insensitive)', () => {
    const result = authService.login('SARAH.CONNOR@CYBERLEGAL.IO');
    expect(result.success).toBe(true);
    expect(result.user.name).toBe('Sarah Connor');
    expect(result.token).toBeTruthy();
  });

  it('rejects an empty email', () => {
    const result = authService.login('');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects a null email', () => {
    const result = authService.login(null);
    expect(result.success).toBe(false);
  });

  it('rejects an email without @ symbol', () => {
    const result = authService.login('notanemail');
    expect(result.success).toBe(false);
  });

  it('rejects an email with no TLD', () => {
    const result = authService.login('user@domain');
    expect(result.success).toBe(false);
  });

  it('auto-creates an account for an unknown valid email', () => {
    const result = authService.login('newlawyer@bigfirm.com');
    expect(result.success).toBe(true);
    expect(result.user.email).toBe('newlawyer@bigfirm.com');
  });

  it('returns the same auto-created account on second login with same email', () => {
    authService.login('repeat@example.com');
    const result2 = authService.login('repeat@example.com');
    expect(result2.success).toBe(true);
    expect(result2.user.email).toBe('repeat@example.com');
  });

  it('token is a non-empty string', () => {
    const result = authService.login('sarah.connor@cyberlegal.io');
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('trims whitespace from email before validation', () => {
    const result = authService.login('  sarah.connor@cyberlegal.io  ');
    expect(result.success).toBe(true);
  });
});

// ─── signup() ─────────────────────────────────────────────────────────────────

describe('signup()', () => {
  it('successfully registers a new user', () => {
    const result = authService.signup('Jane Smith', 'jane@lawfirm.org', 'Partner', 'Smith LLP');
    expect(result.success).toBe(true);
    expect(result.user.name).toBe('Jane Smith');
    expect(result.user.email).toBe('jane@lawfirm.org');
    expect(result.user.role).toBe('Partner');
    expect(result.user.company).toBe('Smith LLP');
  });

  it('rejects signup with missing name', () => {
    const result = authService.signup('', 'noname@example.com');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name/i);
  });

  it('rejects signup with missing email', () => {
    const result = authService.signup('John Doe', '');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/email/i);
  });

  it('rejects signup with invalid email format', () => {
    const result = authService.signup('John Doe', 'bademail');
    expect(result.success).toBe(false);
  });

  it('rejects duplicate email registration', () => {
    authService.signup('Alice First', 'alice@dup.com', 'Associate', 'Firm A');
    const result = authService.signup('Alice Second', 'alice@dup.com', 'Partner', 'Firm B');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/i);
  });

  it('rejects signup with an existing demo user email', () => {
    const result = authService.signup('Impersonator', 'sarah.connor@cyberlegal.io', 'Hacker', 'None');
    expect(result.success).toBe(false);
  });

  it('defaults role and company when omitted', () => {
    const result = authService.signup('Minimal User', 'minimal@test.com');
    expect(result.success).toBe(true);
    expect(result.user.role).toBe('Legal Professional');
    expect(result.user.company).toBe('Private Vault');
  });

  it('generates a unique id for each new user', () => {
    const r1 = authService.signup('User One', 'one@example.com');
    const r2 = authService.signup('User Two', 'two@example.com');
    expect(r1.user.id).not.toBe(r2.user.id);
  });

  it('caps overly long name at 100 characters without throwing', () => {
    const longName = 'A'.repeat(200);
    const result = authService.signup(longName, 'longname@test.com');
    expect(result.success).toBe(true);
    expect(result.user.name.length).toBeLessThanOrEqual(100);
  });
});

// ─── logout() ─────────────────────────────────────────────────────────────────

describe('logout()', () => {
  it('clears the active user so getCurrentUser falls back to default', () => {
    authService.setCurrentUser(authService.getDemoUsers()[1]);
    authService.logout();
    const user = authService.getCurrentUser();
    expect(user.id).toBe('user_sarah_01'); // fallback to first demo user
  });
});

// ─── saveMemory() ─────────────────────────────────────────────────────────────

describe('saveMemory()', () => {
  const userId = 'user_test_mem';
  const memItem = {
    filename: 'TestContract.pdf',
    overallRiskScore: 72,
    riskLevel: 'HIGH RISK',
    eli5Summary: 'A very risky contract.',
  };

  it('returns true on successful save', () => {
    const ok = authService.saveMemory(userId, memItem);
    expect(ok).toBe(true);
  });

  it('saved item appears in getSavedMemories()', () => {
    authService.saveMemory(userId, memItem);
    const memories = authService.getSavedMemories(userId);
    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0].filename).toBe('TestContract.pdf');
  });

  it('assigns a unique id to each saved memory', () => {
    authService.saveMemory(userId, memItem);
    const memories = authService.getSavedMemories(userId);
    expect(memories[0].id).toBeTruthy();
    expect(memories[0].id).toMatch(/^mem_/);
  });

  it('deduplicates by filename — newer item replaces older', () => {
    authService.saveMemory(userId, memItem);
    const updated = { ...memItem, overallRiskScore: 55 };
    authService.saveMemory(userId, updated);
    const memories = authService.getSavedMemories(userId);
    const matching = memories.filter((m) => m.filename === 'TestContract.pdf');
    expect(matching.length).toBe(1);
    expect(matching[0].overallRiskScore).toBe(55);
  });

  it('returns false for missing userId', () => {
    expect(authService.saveMemory('', memItem)).toBe(false);
    expect(authService.saveMemory(null, memItem)).toBe(false);
  });

  it('returns false for missing memoryItem', () => {
    expect(authService.saveMemory(userId, null)).toBe(false);
    expect(authService.saveMemory(userId, undefined)).toBe(false);
  });
});

// ─── getSavedMemories() ───────────────────────────────────────────────────────

describe('getSavedMemories()', () => {
  it('returns an empty array for a new unknown user', () => {
    const memories = authService.getSavedMemories('user_brand_new_999');
    expect(Array.isArray(memories)).toBe(true);
    expect(memories.length).toBe(0);
  });

  it('returns seeded memories for demo user sarah after setCurrentUser', () => {
    authService.setCurrentUser(authService.getDemoUsers()[0]);
    const memories = authService.getSavedMemories('user_sarah_01');
    expect(memories.length).toBeGreaterThan(0);
  });

  it('returns empty array for invalid userId', () => {
    expect(authService.getSavedMemories('')).toEqual([]);
    expect(authService.getSavedMemories(null)).toEqual([]);
  });
});

// ─── deleteMemory() ───────────────────────────────────────────────────────────

describe('deleteMemory()', () => {
  const userId = 'user_del_test';
  const memItem = { filename: 'ToDelete.pdf', overallRiskScore: 30, riskLevel: 'LOW RISK', eli5Summary: 'Safe contract.' };

  it('removes the specified memory entry', () => {
    authService.saveMemory(userId, memItem);
    const memories = authService.getSavedMemories(userId);
    const id = memories[0].id;

    const ok = authService.deleteMemory(userId, id);
    expect(ok).toBe(true);
    const remaining = authService.getSavedMemories(userId);
    expect(remaining.find((m) => m.id === id)).toBeUndefined();
  });

  it('returns false for invalid userId or memoryId', () => {
    expect(authService.deleteMemory('', 'mem_123')).toBe(false);
    expect(authService.deleteMemory('user_x', '')).toBe(false);
    expect(authService.deleteMemory(null, null)).toBe(false);
  });

  it('does not throw when deleting a non-existent id', () => {
    expect(() => authService.deleteMemory(userId, 'mem_ghost_999')).not.toThrow();
  });
});
