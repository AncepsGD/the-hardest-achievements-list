import { useState, useCallback, useMemo, useEffect } from 'react';

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function useSortedList(opts = {}) {
  const { storageKeySuffix = 'achievements', derivedCacheRef = null } = opts || {};

  const [sortKey, setSortKey] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem(`thal_sort_key_${storageKeySuffix}`);
        if (v) return v;
      }
    } catch (e) { }
    return 'rank';
  });

  const [sortDir, setSortDir] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem(`thal_sort_dir_${storageKeySuffix}`);
        if (v) return v;
      }
    } catch (e) { }
    return 'asc';
  });

  useEffect(() => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem(`thal_sort_key_${storageKeySuffix}`, String(sortKey || '')); } catch (e) { }
  }, [sortKey, storageKeySuffix]);

  useEffect(() => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem(`thal_sort_dir_${storageKeySuffix}`, String(sortDir || '')); } catch (e) { }
  }, [sortDir, storageKeySuffix]);

  const compareByKey = useCallback((a, b, key) => {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    const getVal = item => {
      if (!item) return '';
      if (key === 'name') return (item.name || '').toString().toLowerCase();
      if (key === 'length') return Number(item.length) || 0;
      if (key === 'levelID') return Number(item.levelID) || 0;
      if (key === 'rank') return Number(item.rank) || 0;
      if (key === 'date') {
        if (!item.date) return 0;
        try {
          const s = String(item.date).trim();
          if (/^\d{4}-(?:\d{2}|\?\?)-(?:\d{2}|\?\?)$/.test(s)) {
            const normalized = s.replace(/\?\?/g, '01');
            const d = new Date(normalized + 'T00:00:00Z');
            const t = d.getTime();
            return Number.isFinite(t) ? t : Infinity;
          }
          const parsed = new Date(s);
          if (Number.isFinite(parsed.getTime())) {
            const utcMidnight = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
            return utcMidnight;
          }
          const m = s.match(/\bt=(\d+)\b/);
          if (m) {
            const secs = Number(m[1]) || 0;
            return secs * 1000;
          }
          return Infinity;
        } catch (e) {
          return Infinity;
        }
      }
      return (item[key] || '').toString().toLowerCase();
    };
    const va = getVal(a);
    const vb = getVal(b);
    if (typeof va === 'number' && typeof vb === 'number') return va - vb;
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  }, []);

  const [randomSeed, setRandomSeed] = useState(null);

  const getListSignature = useCallback(list => {
    try {
      if (!Array.isArray(list)) return String(list || '');
      return `${list.length}:${list.map(a => (a && a.id) ? String(a.id) : ((a && a.rank) ? `#${a.rank}` : (a && a.name) ? String(a.name).slice(0, 24) : '__')).join(',')}`;
    } catch (e) { try { return String(list.length || 0); } catch (ee) { return '0'; } }
  }, []);

  const sortList = useCallback((list) => {
    try {
      const baseList = list;
      if (!baseList) return baseList;
      const sig = `${getListSignature(baseList)}|${String(sortKey || '')}|${String(sortDir || '')}|${String(randomSeed || '')}`;
      const cache = derivedCacheRef && derivedCacheRef.current && derivedCacheRef.current.dev;
      if (cache && cache.has(sig)) return cache.get(sig);

      let result = baseList;
      if (sortKey) {
        if (sortKey === 'levelID') {
          const onlyWithLevel = baseList.filter(a => { const num = Number(a && a.levelID); return !isNaN(num) && num > 0; });
          const copy = [...onlyWithLevel];
          copy.sort((x, y) => compareByKey(x, y, 'levelID'));
          if (sortDir === 'desc') copy.reverse();
          result = copy;
        } else if (sortKey === 'random') {
          const copy = [...baseList];
          const keys = copy.map((a, i) => (a && a.id) ? String(a.id) : `__idx_${i}`);
          const seed = randomSeed != null ? randomSeed : 1;
          const rng = mulberry32(seed);
          for (let i = keys.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const t = keys[i]; keys[i] = keys[j]; keys[j] = t;
          }
          const map = {};
          keys.forEach((k, i) => { map[k] = i; });
          const getKey = item => (item && item.id) ? String(item.id) : `__idx_${baseList.indexOf(item)}`;
          copy.sort((x, y) => ((map[getKey(x)] || 0) - (map[getKey(y)] || 0)));
          if (sortDir === 'desc') copy.reverse();
          result = copy;
        } else {
          const copy = [...baseList];
          copy.sort((x, y) => compareByKey(x, y, sortKey));
          if (sortDir === 'desc') copy.reverse();
          result = copy;
        }
      }
      try { if (cache) cache.set(sig, result); } catch (e) { }
      return result;
    } catch (e) { return list; }
  }, [sortKey, sortDir, compareByKey, randomSeed, derivedCacheRef, getListSignature]);

  return {
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    randomSeed,
    setRandomSeed,
    compareByKey,
    getListSignature,
    sortList,
  };
}
