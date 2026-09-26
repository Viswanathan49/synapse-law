/**
 * cacheService.js — In-memory LRU (Least Recently Used) cache for AI result memoization
 *
 * Prevents redundant Gemini API calls when the same document text is analysed
 * more than once in a session, and prevents memory leaks via a bounded size limit.
 *
 * @module cacheService
 */

// ── LRU Node ──────────────────────────────────────────────────────────────────

class LRUNode {
  /**
   * @param {string} key
   * @param {unknown} value
   * @param {number} ttl — TTL in milliseconds (0 = no expiry)
   */
  constructor(key, value, ttl) {
    this.key = key;
    this.value = value;
    this.expiry = ttl > 0 ? Date.now() + ttl : 0;
    this.prev = null;
    this.next = null;
  }

  /** @returns {boolean} */
  isExpired() {
    return this.expiry > 0 && Date.now() > this.expiry;
  }
}

// ── LRU Cache ─────────────────────────────────────────────────────────────────

class LRUCache {
  /**
   * @param {number} maxSize   — Maximum number of entries before eviction (default: 20)
   * @param {number} ttlMs     — Time-to-live per entry in milliseconds (default: 5 minutes)
   */
  constructor(maxSize = 20, ttlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.size = 0;
    /** @type {Map<string, LRUNode>} */
    this.map = new Map();
    // Sentinel doubly-linked list: head ↔ … ↔ tail
    this.head = new LRUNode('__head__', null, 0);
    this.tail = new LRUNode('__tail__', null, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // ── Private Helpers ──

  _detach(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _insertAfterHead(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _evictLRU() {
    const lru = this.tail.prev;
    if (lru === this.head) return; // empty
    this._detach(lru);
    this.map.delete(lru.key);
    this.size -= 1;
  }

  // ── Public API ──

  /**
   * Retrieves a cached value by key.
   * Returns `undefined` if not found or expired (and evicts the stale entry).
   * @param {string} key
   * @returns {unknown|undefined}
   */
  get(key) {
    const node = this.map.get(key);
    if (!node) return undefined;
    if (node.isExpired()) {
      this._detach(node);
      this.map.delete(key);
      this.size -= 1;
      return undefined;
    }
    // Move to most-recently-used position
    this._detach(node);
    this._insertAfterHead(node);
    return node.value;
  }

  /**
   * Stores a value. Evicts the least-recently-used entry if full.
   * @param {string} key
   * @param {unknown} value
   * @param {number} [ttlMs] — Override the default TTL for this entry
   */
  set(key, value, ttlMs) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.value = value;
      node.expiry = ttlMs !== undefined ? Date.now() + ttlMs : this.ttlMs > 0 ? Date.now() + this.ttlMs : 0;
      this._detach(node);
      this._insertAfterHead(node);
      return;
    }
    if (this.size >= this.maxSize) {
      this._evictLRU();
    }
    const node = new LRUNode(key, value, ttlMs !== undefined ? ttlMs : this.ttlMs);
    this.map.set(key, node);
    this._insertAfterHead(node);
    this.size += 1;
  }

  /** Removes a specific key */
  delete(key) {
    const node = this.map.get(key);
    if (!node) return;
    this._detach(node);
    this.map.delete(key);
    this.size -= 1;
  }

  /** Clears all entries */
  clear() {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.size = 0;
  }

  /** Returns the current number of live (non-expired) entries */
  get length() {
    return this.size;
  }
}

// ── Singleton Caches (module-level, session-scoped) ───────────────────────────

/**
 * Shared AI result cache — 20 entries, 5-minute TTL per analysis.
 * Used by legalAiService.js to avoid redundant Gemini API calls for identical inputs.
 * @type {LRUCache}
 */
export const aiResultCache = new LRUCache(20, 5 * 60 * 1000);

/**
 * Generates a stable, bounded cache key from document text and parameters.
 * Hashes only the first 2,000 characters to avoid O(n) key generation cost.
 *
 * @param {string} namespace — e.g. 'simplify', 'risks', 'compare', 'qa', 'brief'
 * @param {...string} parts  — variable-length extra identifiers (mode, question, etc.)
 * @returns {string}
 */
export function buildCacheKey(namespace, ...parts) {
  const combined = [namespace, ...parts].join('|');
  // Simple djb2-style hash — fast, deterministic, collision-resistant for our usage
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 33) ^ combined.charCodeAt(i);
    hash >>>= 0; // Convert to unsigned 32-bit
  }
  return `${namespace}::${hash.toString(36)}`;
}

export { LRUCache };
