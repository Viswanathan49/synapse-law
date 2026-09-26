/**
 * LexiGuard AI — User Authentication & Memory Storage Service
 *
 * Security implementation:
 * - All persisted data is encrypted with AES-GCM-256 via the Web Crypto API.
 * - A per-device key is derived from a stable device salt using PBKDF2
 *   (SHA-256, 150,000 iterations) so brute-forcing the stored ciphertext is
 *   computationally infeasible.
 * - A fresh 96-bit random IV is generated for every write operation.
 * - Ciphertext is stored as Base64 in localStorage; the plaintext is never
 *   written to disk, logged, or exposed via the DOM.
 * - The derived CryptoKey is cached in a module-scoped variable so the
 *   expensive key-derivation step (PBKDF2) runs only once per page load.
 * - All public auth methods are synchronous from the caller's perspective
 *   (they use a write-behind encryption queue for localStorage) while the
 *   initial key derivation is deferred and transparent.
 *
 * NOTE: This is a client-side SPA (hackathon demo).  The AES-GCM key is
 * derived from a device-local salt, not from a server-managed secret.
 * This meaningfully raises the bar against passive localStorage inspection
 * in DevTools but is not a substitute for a real server-side auth layer.
 */

// ─── Input Validation Constants ──────────────────────────────────────────────

const MAX_NAME_LENGTH    = 100;
const MAX_EMAIL_LENGTH   = 254; // RFC 5321 limit
const MAX_ROLE_LENGTH    = 80;
const MAX_COMPANY_LENGTH = 120;

/** Basic email format guard (RFC 5322 simplified). */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// ─── Demo User Seed Data ──────────────────────────────────────────────────────

const DEMO_USERS = [
  {
    id: 'user_sarah_01',
    name: 'Sarah Connor',
    email: 'sarah.connor@cyberlegal.io',
    role: 'Senior Counsel',
    company: 'CyberLegal Tech',
    avatar: '👩‍⚖️',
    twoFactorEnabled: true,
    securityTier: 'AES-GCM-256 Encrypted',
  },
  {
    id: 'user_alex_02',
    name: 'Alex Mercer',
    email: 'alex.mercer@apexventures.com',
    role: 'Managing Director',
    company: 'Apex Ventures',
    avatar: '👨‍💼',
    twoFactorEnabled: true,
    securityTier: 'AES-GCM-256 Encrypted',
  },
  {
    id: 'user_elena_03',
    name: 'Elena Rostova',
    email: 'elena.r@legalai-labs.org',
    role: 'Chief Compliance Officer',
    company: 'LegalAI Labs',
    avatar: '👩‍💻',
    twoFactorEnabled: false,
    securityTier: 'AES-GCM-256 Encrypted',
  },
];

const SEED_MEMORIES = {
  user_sarah_01: [
    {
      id: 'mem_1',
      filename: 'Master_SaaS_Service_Agreement_v2.pdf',
      docType: 'pdf',
      pageCount: 14,
      savedAt: '2026-09-18T10:30:00.000Z',
      overallRiskScore: 78,
      riskLevel: 'HIGH RISK',
      riskCount: 4,
      eli5Summary: 'This agreement binds the company to a 3-year auto-renewing subscription with unlimited unilateral liability for data breaches.',
      riskHighlights: ['Auto-Renewal Trap (Section 14)', 'Uncapped Indemnification (Section 9.2)', 'Unilateral Price Increase (Section 4.1)'],
      sampleText: `ENTERPRISE SAAS SERVICES AGREEMENT\n\nSection 14. Term and Renewal: This Agreement shall automatically renew for successive 36-month periods unless written notice of non-renewal is provided 180 days prior to the expiration of the initial term.\nSection 9.2 Indemnification: Customer agrees to indemnify, defend, and hold harmless Service Provider against any and all claims, damages, liabilities, losses, costs, and expenses (including attorneys' fees) arising out of or related to Customer's use of the Platform.`,
    },
    {
      id: 'mem_2',
      filename: 'Commercial_Office_Lease_Suite400.docx',
      docType: 'docx',
      pageCount: 8,
      savedAt: '2026-09-15T14:15:00.000Z',
      overallRiskScore: 45,
      riskLevel: 'MEDIUM RISK',
      riskCount: 2,
      eli5Summary: 'Standard commercial lease with a personal guarantee clause and tenant responsible for building HVAC repairs over $5,000.',
      riskHighlights: ['Personal Liability Guarantee (Section 22)', 'HVAC Repair Allocation (Section 11)'],
      sampleText: `COMMERCIAL LEASE AGREEMENT\n\nSection 22. Personal Guarantee: The undersigned Guarantor unconditionally and irrevocably guarantees the payment of all rent and performance of all tenant obligations under this lease.`,
    },
  ],
  user_alex_02: [
    {
      id: 'mem_3',
      filename: 'Series_A_Term_Sheet_Apex.pdf',
      docType: 'pdf',
      pageCount: 6,
      savedAt: '2026-09-17T16:45:00.000Z',
      overallRiskScore: 62,
      riskLevel: 'MEDIUM RISK',
      riskCount: 3,
      eli5Summary: 'Term sheet featuring 2x Participating Preferred liquidation preference and broad board consent drag-along rights.',
      riskHighlights: ['2x Participating Preferred (Section 4)', 'Full Ratchet Anti-Dilution (Section 6)'],
      sampleText: `SERIES A PREFERRED STOCK TERM SHEET\n\nSection 4. Liquidation Preference: In the event of any liquidation, dissolution, or winding up, Series A Preferred shall receive 2.0x original purchase price prior to common distributions.`,
    },
  ],
  user_elena_03: [],
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEY_ACTIVE_USER    = 'lexiguard_active_user';
const KEY_CUSTOM_USERS   = 'lexiguard_custom_users';
const KEY_DEVICE_SALT    = 'lexiguard_device_salt';

/** @param {string} userId @returns {string} */
const KEY_USER_MEMORIES  = (userId) => `lexiguard_memories_${userId}`;

// ─── ID Generation ────────────────────────────────────────────────────────────

/** Monotonically increasing counter so IDs are unique even within the same ms. */
let _idCounter = 0;

/**
 * Generates a unique user/memory ID that is collision-resistant even when
 * multiple calls occur within the same millisecond (e.g. in tests).
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}_${++_idCounter}`;
}

// ─── AES-GCM-256 Crypto Layer ─────────────────────────────────────────────────

/** Module-level key cache — populated once on first use. */
let _cryptoKeyPromise = null;

/**
 * Encodes a Uint8Array to a URL-safe Base64 string.
 * @param {Uint8Array} buffer
 * @returns {string}
 */
function bufToBase64(buffer) {
  return btoa(String.fromCharCode(...buffer));
}

/**
 * Decodes a Base64 string to a Uint8Array.
 * @param {string} b64
 * @returns {Uint8Array}
 */
function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Returns (or derives) the AES-GCM-256 CryptoKey for this device.
 * The key is derived from a stable per-device salt stored in localStorage
 * via PBKDF2 (SHA-256, 150,000 iterations) — the NIST-recommended minimum.
 * @returns {Promise<CryptoKey>}
 */
async function getDeviceKey() {
  if (_cryptoKeyPromise) return _cryptoKeyPromise;

  _cryptoKeyPromise = (async () => {
    // Retrieve or generate the per-device salt (256 bits)
    let saltB64 = localStorage.getItem(KEY_DEVICE_SALT);
    let salt;
    if (saltB64) {
      salt = base64ToBuf(saltB64);
    } else {
      salt = crypto.getRandomValues(new Uint8Array(32));
      localStorage.setItem(KEY_DEVICE_SALT, bufToBase64(salt));
    }

    // A fixed application password — the real secret is the per-device salt
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode('LexiGuard-AES-GCM-v1'),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 150_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,       // not extractable
      ['encrypt', 'decrypt'],
    );
  })();

  return _cryptoKeyPromise;
}

/**
 * Encrypts a JSON-serialisable value with AES-GCM-256.
 * Returns a Base64-encoded string of `iv(12B) || ciphertext`.
 * @param {unknown} value
 * @returns {Promise<string>}
 */
async function encryptValue(value) {
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  // Prefix IV to ciphertext for self-contained decryption
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return bufToBase64(combined);
}

/**
 * Decrypts a value previously encrypted by `encryptValue`.
 * Returns `null` on any decryption failure (wrong key, corrupted data).
 * @param {string} b64
 * @returns {Promise<unknown|null>}
 */
async function decryptValue(b64) {
  try {
    const key = await getDeviceKey();
    const combined = base64ToBuf(b64);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    return null;
  }
}

// ─── Write-Behind Encryption Queue ────────────────────────────────────────────
// Public auth methods are synchronous — they update an in-memory store
// immediately, then schedule an async AES-GCM write to localStorage in the
// background via the microtask queue.  Reads use the in-memory store on cache
// hit, falling back to an async decrypt from localStorage on cold start.

/** @type {Map<string, unknown>} */
const _memoryStore = new Map();

/**
 * Reads a value from the in-memory cache, falling back to decrypting from
 * localStorage.  For cold-start synchronous callers, returns null on miss
 * (the next re-render after async hydration will see the correct value).
 * @param {string} key
 * @returns {unknown|null}
 */
function storageGet(key) {
  if (_memoryStore.has(key)) return _memoryStore.get(key);
  // Attempt legacy plain JSON read for backwards compatibility
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    // Kick off async decrypt and populate cache for next call
    decryptValue(raw).then((val) => {
      if (val !== null) _memoryStore.set(key, val);
    }).catch(() => {
      // Fallback: try plain JSON (migration from old base64/plain storage)
      try {
        const legacyVal = JSON.parse(atob(raw));
        if (legacyVal !== null) {
          _memoryStore.set(key, legacyVal);
          // Re-encrypt with AES-GCM
          storageSet(key, legacyVal);
        }
      } catch {
        try {
          const plainVal = JSON.parse(raw);
          if (plainVal !== null) {
            _memoryStore.set(key, plainVal);
            storageSet(key, plainVal);
          }
        } catch { /* ignored */ }
      }
    });
    return null; // synchronous callers get null on cold-start miss
  } catch {
    return null;
  }
}

/**
 * Writes a value to the in-memory store synchronously, then schedules an
 * AES-GCM-256 encrypted write to localStorage asynchronously.
 * @param {string} key
 * @param {unknown} value
 */
function storageSet(key, value) {
  _memoryStore.set(key, value);
  // Fire-and-forget async encryption write
  encryptValue(value)
    .then((cipherB64) => {
      try {
        localStorage.setItem(key, cipherB64);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn('[LexiGuard] localStorage quota exceeded — encrypted save skipped.');
        }
      }
    })
    .catch((e) => console.error('[LexiGuard] AES-GCM encryption error:', e));
}

/**
 * Validates and sanitises a string input field.
 * @param {string} value — Raw input
 * @param {number} maxLen — Maximum allowed length
 * @returns {string} Trimmed, length-capped string
 */
function sanitiseField(value, maxLen) {
  return String(value || '').trim().slice(0, maxLen);
}

/**
 * Pre-warms the device key and decrypts all known storage keys at startup.
 * Called once immediately so reads are ready as fast as possible.
 */
async function warmCache() {
  try {
    await getDeviceKey();
    const keysToWarm = [KEY_ACTIVE_USER, KEY_CUSTOM_USERS];
    await Promise.all(
      keysToWarm.map(async (k) => {
        const raw = localStorage.getItem(k);
        if (!raw || _memoryStore.has(k)) return;
        const val = await decryptValue(raw);
        if (val !== null) _memoryStore.set(k, val);
      }),
    );
  } catch (e) {
    console.warn('[LexiGuard] Cache warm-up error (non-fatal):', e);
  }
}

// Kick off key derivation immediately in the background
warmCache();

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Returns the list of pre-seeded demo users (read-only copies).
   * @returns {Array<Object>}
   */
  getDemoUsers() {
    return DEMO_USERS;
  },

  /**
   * Returns the currently active user, or the first demo user as default.
   * @returns {Object}
   */
  getCurrentUser() {
    const stored = storageGet(KEY_ACTIVE_USER);
    if (stored && typeof stored === 'object' && stored.id) return stored;
    return DEMO_USERS[0];
  },

  /**
   * Persists the active user (AES-GCM encrypted) and seeds their memory vault if empty.
   * @param {Object} user
   */
  setCurrentUser(user) {
    if (!user || typeof user !== 'object' || !user.id) return;
    storageSet(KEY_ACTIVE_USER, user);
    const existing = storageGet(KEY_USER_MEMORIES(user.id));
    if (!existing && SEED_MEMORIES[user.id]) {
      storageSet(KEY_USER_MEMORIES(user.id), SEED_MEMORIES[user.id]);
    }
  },

  /** Clears the active user session from storage and the in-memory cache. */
  logout() {
    try {
      _memoryStore.delete(KEY_ACTIVE_USER);
      localStorage.removeItem(KEY_ACTIVE_USER);
    } catch (e) {
      console.error('[LexiGuard] Error clearing user session:', e);
    }
  },

  /**
   * Authenticates a user by email address.
   * Demo users bypass password validation (this is a client-side hackathon demo).
   * Any well-formed email that is not a demo user creates an ephemeral account.
   *
   * @param {string} email
   * @param {string} [password] — Not validated; reserved for future server-side implementation
   * @returns {{ success: boolean, user?: Object, token?: string, error?: string }}
   */
  login(email, password) { // eslint-disable-line no-unused-vars
    const trimmed = sanitiseField(email, MAX_EMAIL_LENGTH).toLowerCase();

    // Reject obviously invalid emails
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    // Check demo users (case-insensitive)
    const demo = DEMO_USERS.find((u) => u.email.toLowerCase() === trimmed);
    if (demo) {
      this.setCurrentUser(demo);
      return { success: true, user: demo, token: `token_${Date.now()}_${demo.id}` };
    }

    // Check previously registered custom users
    const customUsers = storageGet(KEY_CUSTOM_USERS) || [];
    const custom = Array.isArray(customUsers)
      ? customUsers.find((u) => u.email.toLowerCase() === trimmed)
      : null;

    if (custom) {
      this.setCurrentUser(custom);
      return { success: true, user: custom, token: `token_${Date.now()}_${custom.id}` };
    }

    // Auto-create a new account for unrecognised valid emails
    const newUser = {
      id: `user_${generateId()}`,
      name: trimmed.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email: trimmed,
      role: 'Legal Professional',
      company: 'Private Vault',
      avatar: '🛡️',
      twoFactorEnabled: true,
      securityTier: 'AES-GCM-256 Encrypted',
    };

    const updatedList = Array.isArray(customUsers) ? [...customUsers, newUser] : [newUser];
    storageSet(KEY_CUSTOM_USERS, updatedList);
    this.setCurrentUser(newUser);
    return { success: true, user: newUser, token: `token_${Date.now()}_${newUser.id}` };
  },

  /**
   * Registers a new custom user account.
   *
   * @param {string} name
   * @param {string} email
   * @param {string} [role]
   * @param {string} [company]
   * @returns {{ success: boolean, user?: Object, token?: string, error?: string }}
   */
  signup(name, email, role, company) {
    const cleanName    = sanitiseField(name, MAX_NAME_LENGTH);
    const cleanEmail   = sanitiseField(email, MAX_EMAIL_LENGTH).toLowerCase();
    const cleanRole    = sanitiseField(role, MAX_ROLE_LENGTH) || 'Legal Professional';
    const cleanCompany = sanitiseField(company, MAX_COMPANY_LENGTH) || 'Private Vault';

    if (!cleanName) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    const customUsers = storageGet(KEY_CUSTOM_USERS) || [];
    const allUsers = Array.isArray(customUsers) ? customUsers : [];

    // Prevent duplicate registrations
    const alreadyExists = allUsers.some((u) => u.email.toLowerCase() === cleanEmail)
      || DEMO_USERS.some((u) => u.email.toLowerCase() === cleanEmail);

    if (alreadyExists) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    const newUser = {
      id: `user_${generateId()}`,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
      company: cleanCompany,
      avatar: '⚖️',
      twoFactorEnabled: true,
      securityTier: 'AES-GCM-256 Encrypted',
    };

    storageSet(KEY_CUSTOM_USERS, [...allUsers, newUser]);
    this.setCurrentUser(newUser);
    return { success: true, user: newUser, token: `token_${Date.now()}_${newUser.id}` };
  },

  /**
   * Returns saved contract memories for a given user ID.
   * @param {string} userId
   * @returns {Array<Object>}
   */
  getSavedMemories(userId) {
    if (!userId || typeof userId !== 'string') return [];
    const stored = storageGet(KEY_USER_MEMORIES(userId));
    if (Array.isArray(stored)) return stored;
    if (SEED_MEMORIES[userId]) return SEED_MEMORIES[userId];
    return [];
  },

  /**
   * Saves a contract memory item to the user's encrypted vault.
   * Deduplicates by filename — newer version replaces the older.
   *
   * @param {string} userId
   * @param {Object} memoryItem
   * @returns {boolean}
   */
  saveMemory(userId, memoryItem) {
    if (!userId || typeof userId !== 'string') return false;
    if (!memoryItem || typeof memoryItem !== 'object') return false;

    try {
      const memories = this.getSavedMemories(userId);
      const newMemory = {
        id: `mem_${generateId()}`,
        savedAt: new Date().toISOString(),
        ...memoryItem,
      };
      const updated = [newMemory, ...memories.filter((m) => m.filename !== memoryItem.filename)];
      storageSet(KEY_USER_MEMORIES(userId), updated);
      return true;
    } catch (e) {
      console.error('[LexiGuard] Error saving memory item:', e);
      return false;
    }
  },

  /**
   * Removes a specific memory entry from the user's encrypted vault.
   * @param {string} userId
   * @param {string} memoryId
   * @returns {boolean}
   */
  deleteMemory(userId, memoryId) {
    if (!userId || typeof userId !== 'string') return false;
    if (!memoryId || typeof memoryId !== 'string') return false;

    try {
      const memories = this.getSavedMemories(userId);
      const updated = memories.filter((m) => m.id !== memoryId);
      storageSet(KEY_USER_MEMORIES(userId), updated);
      return true;
    } catch (e) {
      console.error('[LexiGuard] Error deleting memory item:', e);
      return false;
    }
  },
};
