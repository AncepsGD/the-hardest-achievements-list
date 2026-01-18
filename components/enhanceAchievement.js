import { TAG_PRIORITY_ORDER } from './Tag';
import { useMemo } from 'react';

class LRUCache {
  constructor(opts = {}) {
    const { max = 1000, ttl = 0, onEvict = null } = opts || {};
    this.max = Number(max) || 1000;
    this.ttl = Number(ttl) || 0;
    this.onEvict = typeof onEvict === 'function' ? onEvict : null;
    this._map = new Map();
  }

  get size() { return this._map.size; }

  _isExpired(entry) {
    if (!entry) return true;
    if (!this.ttl) return false;
    return (Date.now() - (entry.ts || 0)) > this.ttl;
  }

  has(key) {
    try {
      const e = this._map.get(key);
      if (!e) return false;
      if (this._isExpired(e)) {
        this._map.delete(key);
        if (this.onEvict) try { this.onEvict(key, e.value); } catch (err) { }
        return false;
      }
      return true;
    } catch (e) { return false; }
  }

  peek(key) {
    const e = this._map.get(key);
    if (!e) return undefined;
    if (this._isExpired(e)) {
      this._map.delete(key);
      if (this.onEvict) try { this.onEvict(key, e.value); } catch (err) { }
      return undefined;
    }
    return e.value;
  }

  get(key) {
    const e = this._map.get(key);
    if (!e) return undefined;
    if (this._isExpired(e)) {
      this._map.delete(key);
      if (this.onEvict) try { this.onEvict(key, e.value); } catch (err) { }
      return undefined;
    }
    this._map.delete(key);
    this._map.set(key, { value: e.value, ts: e.ts });
    return e.value;
  }

  set(key, value) {
    try {
      if (this._map.has(key)) this._map.delete(key);
      this._map.set(key, { value, ts: Date.now() });
      while (this._map.size > this.max) {
        const oldestKey = this._map.keys().next().value;
        const oldest = this._map.get(oldestKey);
        this._map.delete(oldestKey);
        if (this.onEvict) try { this.onEvict(oldestKey, oldest && oldest.value); } catch (err) { }
      }
    } catch (e) { }
  }

  delete(key) {
    try { return this._map.delete(key); } catch (e) { return false; }
  }

  clear() {
    try { this._map.clear(); } catch (e) { }
  }
}

const ENHANCE_CACHE_MAX = 2000;
const ENHANCE_CACHE_TTL_MS = 10 * 60 * 1000;
const _enhanceCache = new LRUCache({ max: ENHANCE_CACHE_MAX, ttl: ENHANCE_CACHE_TTL_MS, onEvict: (k) => {
  try { _enhanceCacheWrites.delete(k); _enhanceCacheHitCounts.delete(k); } catch (e) { }
} });
let _enhanceCacheHits = 0;
let _enhanceCacheMisses = 0;
const _enhanceCacheWrites = new Map();
const _enhanceCacheHitCounts = new Map();

function getEnhanceCacheStats() {
  try { return { size: _enhanceCache.size, hits: _enhanceCacheHits, misses: _enhanceCacheMisses }; } catch (e) { return { size: 0, hits: 0, misses: 0 }; }
}

function getEnhanceCachePerIdStats() {
  try {
    const writes = Array.from(_enhanceCacheWrites.entries()).map(([id, count]) => ({ id, writes: count }));
    const hits = Array.from(_enhanceCacheHitCounts.entries()).map(([id, count]) => ({ id, hits: count }));
    return { writes, hits };
  } catch (e) { return { writes: [], hits: [] }; }
}

function validateEnhanceCache(opts = {}) {
  try {
    const { minHitRate = 0.5, maxWritesPerId = 1 } = opts || {};
    const s = getEnhanceCacheStats();
    const total = (s.hits || 0) + (s.misses || 0);
    const hitRate = total ? (s.hits / total) : 0;
    const unstable = [];
    _enhanceCacheWrites.forEach((count, id) => { if (count > maxWritesPerId) unstable.push({ id, writes: count }); });
    return { hitRate, hits: s.hits, misses: s.misses, unstable, healthy: hitRate >= minHitRate && unstable.length === 0 };
  } catch (e) { return { hitRate: 0, hits: 0, misses: 0, unstable: [], healthy: false }; }
}

function resetEnhanceCache() {
  try { _enhanceCache.clear(); _enhanceCacheHits = 0; _enhanceCacheMisses = 0; _enhanceCacheWrites.clear(); _enhanceCacheHitCounts.clear(); } catch (e) { }
}

const PASTE_INDEX_CACHE_MAX = 64;
const PASTE_INDEX_CACHE_TTL_MS = 5 * 60 * 1000;
const _pasteIndexCache = new LRUCache({ max: PASTE_INDEX_CACHE_MAX, ttl: PASTE_INDEX_CACHE_TTL_MS });

function _makePasteSignature(items) {
  try {
    if (!Array.isArray(items)) return '';
    const parts = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const a = items[i] || {};
      if (a.id !== undefined && a.id !== null) parts[i] = `id:${String(a.id)}`;
      else if (a.levelID !== undefined && a.levelID !== null) parts[i] = `lvl:${String(a.levelID)}`;
      else if (a.name) parts[i] = `n:${String(a.name).slice(0, 60)}`;
      else parts[i] = `idx:${i}`;
    }
    return parts.join('|');
  } catch (e) {
    return '';
  }
}

function _makeEnhanceSignature(a) {
  try {
    const tags = Array.isArray(a.tags) ? a.tags.slice().sort().join('|') : '';
    const thumb = sanitizeImageUrl(a && a.thumbnail) || '';
    const lengthNum = Number(a.length) || 0;
    const version = a && a.version ? String(a.version) : '';
    const name = a && a.name ? String(a.name) : '';
    return `${tags}::${thumb}::${lengthNum}::${version}::${name}`;
  } catch (e) {
    return '';
  }
}

function normalizeForSearch(input) {
  if (!input || typeof input !== 'string') return '';
  let s = input.trim().toLowerCase();
  try {
    s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  } catch (e) { }
  s = s.replace(/[^a-z0-9]+/g, ' ');
  const alt = {
    'colour': 'color',
    'colours': 'colors',
    'favourite': 'favorite',
    'centre': 'center',
    'behaviour': 'behavior',
    'organisation': 'organization',
    'organisation': 'organization',
    'gaol': 'jail'
  };
  Object.keys(alt).forEach(k => {
    s = s.replace(new RegExp('\\b' + k + '\\b', 'g'), alt[k]);
  });
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function _tokensFromNormalized(normalized) {
  return String(normalized || '').split(' ').filter(Boolean);
}

function enhanceAchievement(a) {
  if (!a || typeof a !== 'object') return a;
  const id = a && a.id ? String(a.id) : null;
  const sig = _makeEnhanceSignature(a);
  if (id) {
    const cached = _enhanceCache.get(id);
    if (cached && cached.signature === sig) {
      _enhanceCacheHits++;
      try { _enhanceCacheHitCounts.set(id, (_enhanceCacheHitCounts.get(id) || 0) + 1); } catch (e) { }
      try {
        const merged = Object.assign({}, cached.value, a);
        try { Object.defineProperty(merged, '_enhanceSig', { value: sig, enumerable: false, configurable: true }); } catch (e) { }
        return merged;
      } catch (e) {
        const out = Object.assign({}, cached.value);
        try { Object.defineProperty(out, '_enhanceSig', { value: sig, enumerable: false, configurable: true }); } catch (ee) { }
        return out;
      }
    }
  }
  const base = { ...a };
  delete base._lengthStr; delete base._thumbnail; delete base._searchable; delete base._searchableNormalized; delete base._tagString;
  delete base.hasThumb; delete base.autoThumb;

  const tags = Array.isArray(base.tags) ? [...base.tags] : [];
  const sortedTags = tags.slice().sort((x, y) => (TAG_PRIORITY_ORDER.indexOf(String(x).toUpperCase()) - TAG_PRIORITY_ORDER.indexOf(String(y).toUpperCase())));
  const isPlatformer = tags.some(t => String(t).toLowerCase() === 'platformer');
  const lengthNum = Number(base.length) || 0;
  const lengthStr = (base.length || base.length === 0) ? `${Math.floor(lengthNum / 60)}:${String(lengthNum % 60).padStart(2, '0')}` : null;

  const thumb = sanitizeImageUrl(base && base.thumbnail) || (base && (base.levelID || base.levelID === 0) ? `https://levelthumbs.prevter.me/thumbnail/${base.levelID}` : null);
  const hasThumb = !!thumb;
  const autoThumb = !!(!base.thumbnail && (base.levelID || base.levelID === 0));

  const searchableParts = [];
  if (base && base.name) searchableParts.push(String(base.name));
  if (base && base.player) searchableParts.push(String(base.player));
  if (base && base.id) searchableParts.push(String(base.id));
  if (base && (base.levelID || base.levelID === 0)) searchableParts.push(String(base.levelID));
  const searchable = searchableParts.join(' ');
  const searchableNormalized = normalizeForSearch(searchable);

  const tagString = (Array.isArray(sortedTags) && sortedTags.length) ? sortedTags.join(' ') : ((Array.isArray(tags) && tags.length) ? tags.join(' ') : '');

  const enhanced = {
    ...base,
    _sortedTags: sortedTags,
    _isPlatformer: isPlatformer,
    _lengthStr: lengthStr,
    _thumbnail: thumb,
    _searchable: (searchable || '').toLowerCase(),
    _searchableNormalized: searchableNormalized,
    _tagString: tagString,
    hasThumb,
    autoThumb,
  };
  try { Object.defineProperty(enhanced, '_enhanceSig', { value: sig, enumerable: false, configurable: true }); } catch (e) { }
  if (id) {
    try {
      _enhanceCache.set(id, { signature: sig, value: enhanced });
      _enhanceCacheMisses++;
      _enhanceCacheWrites.set(id, (_enhanceCacheWrites.get(id) || 0) + 1);
    } catch (e) { }
  } else {
    _enhanceCacheMisses++;
    if (process && process.env && process.env.NODE_ENV === 'development') {
      console.warn('enhanceAchievement: achievement has no `id` — caching disabled for this item', a && a.name);
    }
  }
  return enhanced;
}

function mapEnhanceArray(origArr, prevEnhanced) {
  if (!Array.isArray(origArr)) return origArr;
  const out = new Array(origArr.length);
  const prevById = new Map();
  if (Array.isArray(prevEnhanced)) {
    for (let i = 0; i < prevEnhanced.length; i++) {
      const e = prevEnhanced[i];
      if (e && e.id !== undefined && e.id !== null) prevById.set(String(e.id), e);
    }
  }

  for (let i = 0; i < origArr.length; i++) {
    const a = origArr[i];
    if (!a) { out[i] = a; continue; }
    const id = a && a.id ? String(a.id) : null;
    const sig = _makeEnhanceSignature(a);
    if (id && prevById.has(id)) {
      const prev = prevById.get(id);
      if (prev && prev._enhanceSig === sig) {
        out[i] = prev;
        continue;
      }
    }
    out[i] = enhanceAchievement(a);
  }
  return out;
}

function sanitizeImageUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  if (s.startsWith('data:')) {
    if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(s)) return s;
    return null;
  }
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    if (u.protocol !== 'https:') return null;
    return u.href;
  } catch (e) {
    return null;
  }
}

function getThumbnailUrl(achievement, isMobile) {
  try {
    const idPart = (achievement && (achievement.id !== undefined && achievement.id !== null)) ? `id:${String(achievement.id)}`
      : (achievement && (achievement.levelID !== undefined && achievement.levelID !== null)) ? `level:${String(achievement.levelID)}`
        : (achievement && achievement.thumbnail) ? `thumb:${String(achievement.thumbnail)}`
          : 'default';
    const key = `${idPart}::${isMobile ? 'm' : 'd'}`;
    if (getThumbnailUrl._cache && getThumbnailUrl._cache.has(key)) return getThumbnailUrl._cache.get(key);

    let url = null;
    if (achievement && achievement.thumbnail) {
      url = achievement.thumbnail;
    } else if (achievement && achievement.levelID) {
      const baseUrl = `https://levelthumbs.prevter.me/thumbnail/${achievement.levelID}`;
      url = isMobile ? `${baseUrl}/small` : baseUrl;
    }

    try {
      if (!getThumbnailUrl._cache) getThumbnailUrl._cache = new Map();
      getThumbnailUrl._cache.set(key, url);
    } catch (e) { }

    return url;
  } catch (e) {
    return null;
  }
}

export {
  enhanceAchievement,
  mapEnhanceArray,
  sanitizeImageUrl,
  getThumbnailUrl,
  normalizeForSearch,
  getEnhanceCacheStats,
  resetEnhanceCache,
  getEnhanceCachePerIdStats,
  validateEnhanceCache,
  _makePasteSignature,
  _tokensFromNormalized,
  useEnhancementCache,
};

export function useEnhancementCache() {
  return useMemo(() => ({
    enhanceAchievement,
    mapEnhanceArray,
    sanitizeImageUrl,
    getThumbnailUrl,
    normalizeForSearch,
    getEnhanceCacheStats,
    resetEnhanceCache,
    getEnhanceCachePerIdStats,
    validateEnhanceCache,
    makePasteSignature: _makePasteSignature,
    tokensFromNormalized: _tokensFromNormalized,
  }), []);
}
