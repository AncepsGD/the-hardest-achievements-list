class LRUCache {
  constructor(opts = {}) {
    const { max = 1000, ttl = 0 } = opts || {};
    this.max = Number(max) || 1000;
    this.ttl = Number(ttl) || 0;
    this._map = new Map();
  }
  get size() { return this._map.size; }
  _isExpired(entry) {
    if (!entry) return true;
    if (!this.ttl) return false;
    return (Date.now() - (entry.ts || 0)) > this.ttl;
  }
  has(key) {
    const e = this._map.get(key);
    if (!e) return false;
    if (this._isExpired(e)) { this._map.delete(key); return false; }
    return true;
  }
  get(key) {
    const e = this._map.get(key);
    if (!e) return undefined;
    if (this._isExpired(e)) { this._map.delete(key); return undefined; }
    this._map.delete(key);
    this._map.set(key, { value: e.value, ts: e.ts });
    return e.value;
  }
  set(key, value) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, { value, ts: Date.now() });
    while (this._map.size > this.max) {
      const oldestKey = this._map.keys().next().value;
      this._map.delete(oldestKey);
    }
  }
  clear() { this._map.clear(); }
}
const DERIVED_CACHE_MAX = 128;
const DERIVED_CACHE_TTL_MS = 5 * 60 * 1000;

const manager = {
  reorderedRef: { current: null },
  stagedRef: { current: null },
  editIdxRef: { current: null },
  editFormRef: { current: null },
  editFormTagsRef: { current: [] },
  editFormCustomTagsRef: { current: '' },

  derivedCacheRef: { current: { filtered: new LRUCache({ max: DERIVED_CACHE_MAX, ttl: DERIVED_CACHE_TTL_MS }), dev: new LRUCache({ max: DERIVED_CACHE_MAX, ttl: DERIVED_CACHE_TTL_MS }) } },
  pasteIndexRef: { current: [] },
  pastePrefixMapRef: { current: new Map() },

  setReordered(arr) { this.reorderedRef.current = arr; },
  setStaged(arr) { this.stagedRef.current = arr; },
};

export default manager;
