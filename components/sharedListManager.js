class LRUCache {
  constructor({ max = 1000, ttl = 0 } = {}) {
    this.max = max | 0;
    this.ttl = ttl | 0;
    this._map = new Map();
  }

  get size() {
    return this._map.size;
  }

  _expired(entry, now) {
    return this.ttl !== 0 && (now - entry.ts) > this.ttl;
  }

  _touch(key, entry) {
    this._map.delete(key);
    this._map.set(key, entry);
  }

  has(key) {
    const entry = this._map.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (this._expired(entry, now)) {
      this._map.delete(key);
      return false;
    }
    return true;
  }

  get(key) {
    const entry = this._map.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (this._expired(entry, now)) {
      this._map.delete(key);
      return undefined;
    }

    this._touch(key, entry);
    return entry.value;
  }

  set(key, value) {
    const now = Date.now();
    const entry = this._map.get(key);

    if (entry) {
      entry.value = value;
      entry.ts = now;
      this._touch(key, entry);
    } else {
      this._map.set(key, { value, ts: now });
    }

    if (this._map.size > this.max) {
      this._map.delete(this._map.keys().next().value);
    }
  }

  clear() {
    this._map.clear();
  }
}

const DERIVED_CACHE_MAX = 128;
const DERIVED_CACHE_TTL_MS = 300000;

const manager = Object.freeze({
  reorderedRef: { current: null },
  stagedRef: { current: null },
  editIdxRef: { current: null },
  editFormRef: { current: null },
  editFormTagsRef: { current: [] },
  editFormCustomTagsRef: { current: '' },

  derivedCacheRef: {
    current: {
      filtered: new LRUCache({ max: DERIVED_CACHE_MAX, ttl: DERIVED_CACHE_TTL_MS }),
      dev: new LRUCache({ max: DERIVED_CACHE_MAX, ttl: DERIVED_CACHE_TTL_MS }),
    },
  },

  pasteIndexRef: { current: [] },
  pastePrefixMapRef: { current: new Map() },

  setReordered(arr) {
    this.reorderedRef.current = arr;
  },

  setStaged(arr) {
    this.stagedRef.current = arr;
  },
});

export default manager;
