/**
 * cacheService.test.js — Tests for the LRU cache with TTL expiry
 *
 * Covers: basic get/set, LRU eviction, TTL expiry, key collision avoidance,
 * cache clearing, delete, buildCacheKey determinism, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LRUCache, aiResultCache, buildCacheKey } from '../services/cacheService.js';

// ─── LRUCache — Basic Operations ─────────────────────────────────────────────

describe('LRUCache — basic get/set', () => {
  let cache;

  beforeEach(() => {
    cache = new LRUCache(3, 60_000); // 3 entries max, 1-min TTL
  });

  it('stores and retrieves a value', () => {
    cache.set('key1', { foo: 'bar' });
    expect(cache.get('key1')).toEqual({ foo: 'bar' });
  });

  it('returns undefined for a missing key', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('overwrites an existing key', () => {
    cache.set('key1', 'first');
    cache.set('key1', 'second');
    expect(cache.get('key1')).toBe('second');
    expect(cache.length).toBe(1);
  });

  it('increments length on new entries', () => {
    expect(cache.length).toBe(0);
    cache.set('a', 1);
    expect(cache.length).toBe(1);
    cache.set('b', 2);
    expect(cache.length).toBe(2);
  });

  it('stores null and falsy values correctly', () => {
    cache.set('zero', 0);
    cache.set('empty', '');
    cache.set('nul', null);
    expect(cache.get('zero')).toBe(0);
    expect(cache.get('empty')).toBe('');
    expect(cache.get('nul')).toBeNull();
  });
});

// ─── LRUCache — LRU Eviction ──────────────────────────────────────────────────

describe('LRUCache — LRU eviction', () => {
  it('evicts the least-recently-used entry when at capacity', () => {
    const cache = new LRUCache(3, 0); // no TTL
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    // Access 'a' to make it most recent
    cache.get('a');
    // Now add 'd' — 'b' should be evicted (LRU)
    cache.set('d', 4);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('promotes a read key to most-recently-used', () => {
    const cache = new LRUCache(2, 0);
    cache.set('x', 10);
    cache.set('y', 20);
    cache.get('x'); // promote x
    cache.set('z', 30); // should evict y
    expect(cache.get('y')).toBeUndefined();
    expect(cache.get('x')).toBe(10);
    expect(cache.get('z')).toBe(30);
  });

  it('respects exact max size', () => {
    const cache = new LRUCache(5, 0);
    for (let i = 0; i < 10; i++) cache.set(`k${i}`, i);
    expect(cache.length).toBe(5);
  });
});

// ─── LRUCache — TTL Expiry ────────────────────────────────────────────────────

describe('LRUCache — TTL expiry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the value before TTL expires', () => {
    const cache = new LRUCache(10, 5_000); // 5-second TTL
    cache.set('item', 'alive');
    vi.advanceTimersByTime(4_999);
    expect(cache.get('item')).toBe('alive');
  });

  it('returns undefined after TTL expires', () => {
    const cache = new LRUCache(10, 5_000);
    cache.set('item', 'alive');
    vi.advanceTimersByTime(5_001);
    expect(cache.get('item')).toBeUndefined();
  });

  it('evicts expired entry and decrements length', () => {
    const cache = new LRUCache(10, 1_000);
    cache.set('item', 42);
    expect(cache.length).toBe(1);
    vi.advanceTimersByTime(1_001);
    cache.get('item'); // triggers eviction
    expect(cache.length).toBe(0);
  });

  it('per-entry TTL override works', () => {
    const cache = new LRUCache(10, 60_000);
    cache.set('short', 'val', 100); // 100ms TTL override
    vi.advanceTimersByTime(101);
    expect(cache.get('short')).toBeUndefined();
  });

  it('no-expiry entries (ttl=0) never expire', () => {
    const cache = new LRUCache(10, 0);
    cache.set('permanent', 'forever');
    vi.advanceTimersByTime(999_999_999);
    expect(cache.get('permanent')).toBe('forever');
  });
});

// ─── LRUCache — delete and clear ─────────────────────────────────────────────

describe('LRUCache — delete and clear', () => {
  it('deletes a specific key', () => {
    const cache = new LRUCache(5, 0);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.length).toBe(1);
  });

  it('deleting a missing key is a no-op', () => {
    const cache = new LRUCache(5, 0);
    expect(() => cache.delete('nope')).not.toThrow();
    expect(cache.length).toBe(0);
  });

  it('clear() removes all entries', () => {
    const cache = new LRUCache(5, 0);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.length).toBe(0);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});

// ─── buildCacheKey ────────────────────────────────────────────────────────────

describe('buildCacheKey()', () => {
  it('returns a string', () => {
    expect(typeof buildCacheKey('simplify', 'some text', 'clauses')).toBe('string');
  });

  it('includes the namespace as a prefix', () => {
    const key = buildCacheKey('risks', 'doc');
    expect(key.startsWith('risks::')).toBe(true);
  });

  it('is deterministic — same inputs produce the same key', () => {
    const a = buildCacheKey('qa', 'contract text', 'what is the penalty?');
    const b = buildCacheKey('qa', 'contract text', 'what is the penalty?');
    expect(a).toBe(b);
  });

  it('different inputs produce different keys', () => {
    const a = buildCacheKey('simplify', 'text A', 'eli5');
    const b = buildCacheKey('simplify', 'text B', 'eli5');
    expect(a).not.toBe(b);
  });

  it('different namespaces produce different keys for same content', () => {
    const a = buildCacheKey('simplify', 'text');
    const b = buildCacheKey('risks', 'text');
    expect(a).not.toBe(b);
  });

  it('handles empty parts without throwing', () => {
    expect(() => buildCacheKey('brief')).not.toThrow();
    expect(() => buildCacheKey('qa', '', '')).not.toThrow();
  });
});

// ─── aiResultCache singleton ──────────────────────────────────────────────────

describe('aiResultCache singleton', () => {
  beforeEach(() => aiResultCache.clear());

  it('is an LRUCache instance', () => {
    expect(aiResultCache).toBeInstanceOf(LRUCache);
  });

  it('stores and retrieves AI results', () => {
    const key = buildCacheKey('simplify', 'NDA text', 'clauses');
    const result = { documentTitle: 'NDA', clauses: [] };
    aiResultCache.set(key, result);
    expect(aiResultCache.get(key)).toEqual(result);
  });

  it('returns undefined for uncached results', () => {
    expect(aiResultCache.get('nonexistent::key')).toBeUndefined();
  });
});
