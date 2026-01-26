import { useEffect, useRef, useState } from 'react';

export function useScrollPersistence({
  storageKey,
  items = [],
  devMode = false,
  listRef = null,
  itemRefs = null,
  setScrollToIdx = null,
  setHighlightedIdx = null,
  itemHeight = null,
}) {
  const [restoredScroll, setRestoredScroll] = useState(null);
  const lastSavedIdxRef = useRef(null);
  const pendingIdxRef = useRef(null);
  const rafRef = useRef(null);
  const saveIdleRef = useRef(null);
  const scrollListenerRef = useRef(null);
  const bboxCacheRef = useRef(null);
  const cacheBuiltAtRef = useRef(0);
  const usedElementsFromPointRef = useRef(false);
  const resolvedContainerRef = useRef(null);
  const strategyRef = useRef(null);
  const pendingScrollTopRef = useRef(null);
  const lastSavedScrollTopRef = useRef(null);
  const idleHandleRef = useRef(null);
  const isRestoringRef = useRef(false);
  const SCROLL_DELTA_THRESHOLD = 5;
  const pendingSaveRef = useRef(null);
  const writeHandleRef = useRef(null);
  const lastPersistedIdxRef = useRef(null);
  const offsetPersistTimerRef = useRef(null);
  const OFFSET_PERSIST_DELAY = 2000;
  const WRITE_IDLE_TIMEOUT = 1000;
  const resolveContainerValue = () => {
    if (typeof window === 'undefined') return null;
    const lr = listRef && listRef.current;
    return devMode
      ? window
      : lr
        ? lr._outerRef || lr.outerRef || lr._listRef || lr._scrollingContainer || lr
        : window;
  };
  const resolvedContainerValue = resolveContainerValue();

  const runSafe = (fn) => {
    if (devMode) return fn();
    try {
      return fn();
    } catch (e) {
      return null;
    }
  };

  const getMostVisibleIdx = () => {

    const strategy = strategyRef.current;
    const container = resolvedContainerRef.current;
    if (strategy === 'math' && itemHeight && typeof itemHeight === 'number' && itemHeight > 0) {
      let scrollTop = 0;
      let viewportHeight = window.innerHeight || (container && container.clientHeight) || 0;
      if (container && typeof container.scrollTop === 'number') scrollTop = container.scrollTop;
      else scrollTop = window.pageYOffset || window.scrollY || 0;
      const viewportMid = scrollTop + (viewportHeight / 2);
      const idx = Math.floor(viewportMid / Number(itemHeight));
      if (idx >= 0 && idx < items.length) return idx;
      return Math.max(0, Math.min(items.length - 1, idx));
    }

    if (strategy === 'refs') {

      const cache = bboxCacheRef.current;
      if (cache && cache.length) {
        const vpTop = window.pageYOffset || window.scrollY || 0;
        const vpBottom = vpTop + window.innerHeight;
        let best = null;
        let bestVisible = 0;
        for (let i = 0; i < cache.length; i++) {
          const b = cache[i];
          if (!b) continue;
          const vis = Math.max(0, Math.min(b.bottomAbs, vpBottom) - Math.max(b.topAbs, vpTop));
          if (vis > bestVisible) {
            bestVisible = vis;
            best = i;
          }
        }
        if (best !== null) return best;
      }

      if (!itemRefs || !itemRefs.current) return null;
      let maxVisible = 0;
      let bestIdx = null;
      for (let idx = 0; idx < itemRefs.current.length; idx++) {
        const ref = itemRefs.current[idx];
        if (!ref) continue;
        const rect = ref.getBoundingClientRect();
        const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        if (visible > maxVisible) {
          maxVisible = visible;
          bestIdx = idx;
        }
      }
      return bestIdx;
    }

    if (strategy === 'container') {

      const cache = bboxCacheRef.current;
      if (cache && cache.length && container) {
        const vpTop = window.pageYOffset || window.scrollY || 0;
        const vpBottom = vpTop + (container.clientHeight || window.innerHeight);
        let best = null;
        let bestVisible = 0;
        for (let i = 0; i < cache.length; i++) {
          const b = cache[i];
          if (!b) continue;
          const vis = Math.max(0, Math.min(b.bottomAbs, vpBottom) - Math.max(b.topAbs, vpTop));
          if (vis > bestVisible) {
            bestVisible = vis;
            best = i;
          }
        }
        if (best !== null) return best;
      }
      if (!itemRefs || !itemRefs.current) return null;
      let maxVisible = 0;
      let bestIdx = null;
      for (let idx = 0; idx < itemRefs.current.length; idx++) {
        const ref = itemRefs.current[idx];
        if (!ref) continue;
        const rect = ref.getBoundingClientRect();
        const visible = Math.max(0, Math.min(rect.bottom, (container ? (container.clientHeight || window.innerHeight) : window.innerHeight)) - Math.max(rect.top, 0));
        if (visible > maxVisible) {
          maxVisible = visible;
          bestIdx = idx;
        }
      }
      return bestIdx;
    }

    return null;
  };
  const saveScrollPosition = (pos, flush = false) => {

    if (isRestoringRef.current && !flush) return;
    try {
      if (typeof window === 'undefined') return;
      if (!pos || pos.index === null || pos.index === undefined) {
        if (flush) {
          try { localStorage.removeItem(storageKey); } catch (e) { }
        } else {
          pendingSaveRef.current = { remove: true };
          scheduleWrite();
        }
        return;
      }

      const idx = Number(pos.index);
      const offset = pos.offset !== undefined && pos.offset !== null ? Number(pos.offset) : null;
      if (flush) {
        try {
          const out = { index: idx };
          if (offset !== null) out.offset = offset;
          localStorage.setItem(storageKey, JSON.stringify(out));
          lastPersistedIdxRef.current = idx;
        } catch (e) { }
        return;
      }
      const lastPersisted = lastPersistedIdxRef.current;
      if (lastPersisted == null || lastPersisted !== idx) {

        pendingSaveRef.current = { index: idx, offset };
        lastPersistedIdxRef.current = idx;

        if (offsetPersistTimerRef.current) {
          clearTimeout(offsetPersistTimerRef.current);
          offsetPersistTimerRef.current = null;
        }
        scheduleWrite();
      } else {

        pendingSaveRef.current = pendingSaveRef.current || { index: idx, offset: null };
        pendingSaveRef.current.offset = offset !== null ? offset : pendingSaveRef.current.offset;
        if (offsetPersistTimerRef.current) clearTimeout(offsetPersistTimerRef.current);
        offsetPersistTimerRef.current = setTimeout(() => {
          pendingSaveRef.current = pendingSaveRef.current || { index: idx, offset: null };
          scheduleWrite();
          offsetPersistTimerRef.current = null;
        }, OFFSET_PERSIST_DELAY);
      }
    } catch (e) { }
  };

  const performWrite = (saveObj) => {
    try {
      if (!saveObj) return;
      if (saveObj.remove) {
        try { localStorage.removeItem(storageKey); } catch (e) { }
        pendingSaveRef.current = null;
        return;
      }
      const out = { index: Number(saveObj.index) };
      if (saveObj.offset !== undefined && saveObj.offset !== null) out.offset = Number(saveObj.offset);
      try { localStorage.setItem(storageKey, JSON.stringify(out)); } catch (e) { }
      pendingSaveRef.current = null;
    } catch (e) { }
  };

  const scheduleWrite = () => {
    try {
      if (writeHandleRef.current != null) return;
      const cb = () => {
        writeHandleRef.current = null;
        const toWrite = pendingSaveRef.current;
        performWrite(toWrite);
      };
      if (typeof window.requestIdleCallback === 'function') {
        try {
          writeHandleRef.current = window.requestIdleCallback(cb, { timeout: WRITE_IDLE_TIMEOUT });
          return;
        } catch (e) { }
      }
      writeHandleRef.current = window.setTimeout(cb, 500);
    } catch (e) { }
  };

  const cancelScheduledWrite = () => {
    try {
      if (writeHandleRef.current == null) return;
      if (typeof window.cancelIdleCallback === 'function' && typeof writeHandleRef.current === 'number') {
        try { window.cancelIdleCallback(writeHandleRef.current); } catch (e) { }
      } else {
        clearTimeout(writeHandleRef.current);
      }
      writeHandleRef.current = null;
    } catch (e) { }
  };

  const readSavedScrollIndex = () => {
    try {
      if (typeof window === 'undefined') return null;

      const v = localStorage.getItem(storageKey);
      if (!v) return null;

      try {
        const parsed = JSON.parse(v);
        if (!parsed || typeof parsed !== 'object') return null;

        const idx = Number(parsed.index);
        if (!Number.isFinite(idx)) return null;

        const offset = parsed.offset !== undefined ? Number(parsed.offset) : null;
        return {
          index: idx,
          offset: Number.isFinite(offset) ? offset : null,
        };
      } catch (e) {
        const n = Number(v);
        return Number.isFinite(n) ? { index: n, offset: null } : null;
      }
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resolveContainerAndStrategy = () => {
      try {
        const container = resolvedContainerValue || window;
        resolvedContainerRef.current = container;
        const lr = listRef && listRef.current;
        if (lr) {
          if (itemHeight && typeof itemHeight === 'number' && itemHeight > 0 && container && typeof container.scrollTop === 'number') {
            strategyRef.current = 'math';
          } else {
            strategyRef.current = 'container';
          }
        } else if (itemRefs && itemRefs.current && itemRefs.current.length) {
          strategyRef.current = 'refs';
        } else {
          strategyRef.current = 'container';
        }
      } catch (e) {
        strategyRef.current = 'refs';
        resolvedContainerRef.current = window;
      }
    };

    resolveContainerAndStrategy();
    const computeMostVisibleIdxForContainer = (container) => {

      const strategy = strategyRef.current;
      if (strategy === 'math' && itemHeight && typeof itemHeight === 'number' && itemHeight > 0) {
        const containerTop = (typeof container.scrollTop === 'number') ? container.scrollTop : (window.pageYOffset || window.scrollY || 0);
        const viewportHeight = container.clientHeight || window.innerHeight;
        const viewportMid = containerTop + (viewportHeight / 2);
        const idx = Math.floor(viewportMid / Number(itemHeight));
        if (idx >= 0 && idx < items.length) return idx;
        return Math.max(0, Math.min(items.length - 1, idx));
      }

      if (strategy === 'container') {
        const cache = bboxCacheRef.current;
        if (cache && cache.length) {
          const vpTop = window.pageYOffset || window.scrollY || 0;
          const vpBottom = vpTop + (container.clientHeight || window.innerHeight);
          let best = null;
          let bestVisible = 0;
          for (let i = 0; i < cache.length; i++) {
            const b = cache[i];
            if (!b) continue;
            const vis = Math.max(0, Math.min(b.bottomAbs, vpBottom) - Math.max(b.topAbs, vpTop));
            if (vis > bestVisible) {
              bestVisible = vis;
              best = i;
            }
          }
          if (best !== null) return best;
        }
        if (!usedElementsFromPointRef.current && typeof document.elementsFromPoint === 'function') {
          usedElementsFromPointRef.current = true;
          const rect = container.getBoundingClientRect();
          const x = rect.left + 10;
          const y = rect.top + (container.clientHeight || rect.height) / 2;
          const els = document.elementsFromPoint(x, y);
          for (const el of els) {
            if (!el) continue;
            const ai = el.getAttribute && el.getAttribute('data-index');
            if (ai != null) return Number(ai);

            let p = el.parentElement;
            while (p) {
              const pi = p.getAttribute && p.getAttribute('data-index');
              if (pi != null) return Number(pi);
              p = p.parentElement;
            }
          }
        }
      }
      return null;
    };

    const computeAndSave = () => {

      const container = resolvedContainerRef.current || (listRef && listRef.current) || null;
      const idx = getMostVisibleIdx();

      const pendingTop = pendingScrollTopRef.current;
      const offset = (typeof pendingTop === 'number')
        ? pendingTop
        : (container && typeof container.scrollTop === 'number') ? container.scrollTop : (window.pageYOffset || window.scrollY || 0);
      if (typeof lastSavedScrollTopRef.current === 'number' && typeof offset === 'number') {
        if (Math.abs(offset - lastSavedScrollTopRef.current) < SCROLL_DELTA_THRESHOLD && idx === lastSavedIdxRef.current) {
          return;
        }
      }

      if (idx !== null && idx !== undefined) {
        lastSavedIdxRef.current = idx;
        lastSavedScrollTopRef.current = offset;
        saveScrollPosition({ index: idx, offset });
      }

      pendingScrollTopRef.current = null;
      pendingIdxRef.current = null;
    };
    const scheduleIdleCompute = () => {
      try {

        if (isRestoringRef.current) return;
        if (idleHandleRef.current != null) return;
        const cb = () => {
          idleHandleRef.current = null;
          runSafe(computeAndSave);
        };
        if (typeof window.requestIdleCallback === 'function') {
          try {
            idleHandleRef.current = window.requestIdleCallback(cb, { timeout: 1000 });
            return;
          } catch (e) {

          }
        }
        idleHandleRef.current = window.setTimeout(cb, 500);
      } catch (e) { }
    };

    const cancelIdleCompute = () => {
      try {
        if (idleHandleRef.current == null) return;
        if (typeof window.cancelIdleCallback === 'function' && typeof idleHandleRef.current === 'number') {
          try { window.cancelIdleCallback(idleHandleRef.current); } catch (e) { }
        } else {
          clearTimeout(idleHandleRef.current);
        }
        idleHandleRef.current = null;
      } catch (e) { }
    };

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        runSafe(() => {
          const lr = listRef && listRef.current;
          let container = resolvedContainerRef.current || (lr && (lr._outerRef || lr.outerRef || lr._listRef || lr._scrollingContainer)) || null;
          if (!container && lr) container = lr;

          const scrollTop = container && typeof container.scrollTop === 'number' ? container.scrollTop : (window.pageYOffset || window.scrollY || 0);
          pendingScrollTopRef.current = scrollTop;
          const last = lastSavedScrollTopRef.current;
          if (typeof last === 'number' && Math.abs(scrollTop - last) < SCROLL_DELTA_THRESHOLD) {
            return;
          }
          scheduleIdleCompute();
        });
      });
    };

    const target = resolvedContainerValue || window;
    try {
      if (target && target.addEventListener) {
        target.addEventListener('scroll', onScroll, { passive: true });
        scrollListenerRef.current = { target, handler: onScroll };
      }
    } catch (e) { }
    runSafe(() => { if (!isRestoringRef.current) computeAndSave(); });

    const onUnload = () => {

      cancelIdleCompute();
      cancelScheduledWrite();
      if (pendingSaveRef.current) {
        performWrite(pendingSaveRef.current);
      } else {

        runSafe(() => computeAndSave());
        if (pendingSaveRef.current) performWrite(pendingSaveRef.current);
      }
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      try {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (saveIdleRef.current) clearTimeout(saveIdleRef.current);

        try { cancelIdleCompute(); } catch (e) { }
        try { cancelScheduledWrite(); } catch (e) { }
        if (offsetPersistTimerRef.current) { clearTimeout(offsetPersistTimerRef.current); offsetPersistTimerRef.current = null; }
        if (scrollListenerRef.current && scrollListenerRef.current.target && scrollListenerRef.current.handler) {
          try { scrollListenerRef.current.target.removeEventListener('scroll', scrollListenerRef.current.handler); } catch (e) { }
        }
        window.removeEventListener('beforeunload', onUnload);
      } catch (e) { }
    };

  }, [devMode, resolvedContainerValue, storageKey]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const buildCache = () => {
      try {
        if (!itemRefs || !itemRefs.current) {
          bboxCacheRef.current = null;
          cacheBuiltAtRef.current = Date.now();
          return;
        }
        const out = new Array(itemRefs.current.length);
        for (let i = 0; i < itemRefs.current.length; i++) {
          const el = itemRefs.current[i];
          if (!el || typeof el.getBoundingClientRect !== 'function') {
            out[i] = null;
            continue;
          }
          const r = el.getBoundingClientRect();
          const topAbs = r.top + (window.pageYOffset || window.scrollY || 0);
          const bottomAbs = r.bottom + (window.pageYOffset || window.scrollY || 0);
          out[i] = { topAbs, bottomAbs };
        }
        bboxCacheRef.current = out;
        cacheBuiltAtRef.current = Date.now();
      } catch (e) {
        bboxCacheRef.current = null;
        cacheBuiltAtRef.current = Date.now();
      }
    };

    buildCache();
    const onResize = () => {
      bboxCacheRef.current = null;

      if (saveIdleRef.current) clearTimeout(saveIdleRef.current);
      saveIdleRef.current = setTimeout(() => buildCache(), 150);
    };
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    return () => {
      try {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
        if (saveIdleRef.current) clearTimeout(saveIdleRef.current);
      } catch (e) { }
    };
  }, [items.length, itemRefs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (items.length === 0) return;

    const saved = readSavedScrollIndex();
    if (saved === null) return;
    isRestoringRef.current = true;
    setRestoredScroll(saved);

    const t = window.setTimeout(() => {
      try {
        const targetIdx = Math.max(0, Math.floor(Number(saved.index)));
        if (setScrollToIdx) setScrollToIdx(targetIdx);
        if (setHighlightedIdx) setHighlightedIdx(targetIdx);
      } catch (e) {
      }
    }, 300);

    return () => clearTimeout(t);
  }, [items.length, storageKey]);

  useEffect(() => {
    if (!restoredScroll) return;

    try {
      const { index, offset } = restoredScroll || {};
      if (offset == null) return;

      if (listRef && listRef.current) {
        const container =
          listRef.current && listRef.current._outerRef
            ? listRef.current._outerRef
            : listRef.current;

        if (container && typeof container.scrollTop === 'number') {

          requestAnimationFrame(() => {
            try {
              const top = Math.max(
                0,
                Math.min(Number(offset), container.scrollHeight || Number(offset))
              );
              container.scrollTop = top;
            } catch (e) {
            }
          });
        }
      } else if (itemRefs && itemRefs.current && itemRefs.current[index]) {
        const el = itemRefs.current[index];
        if (el && typeof el.getBoundingClientRect === 'function') {
          requestAnimationFrame(() => {
            try {
              const savedAbsoluteTop = Number(offset);
              window.scrollTo({ top: savedAbsoluteTop, left: 0, behavior: 'auto' });
            } catch (e) {
            }
          });
        }
      }
      isRestoringRef.current = false;
    } catch (e) {
    }

    setRestoredScroll(null);
  }, [restoredScroll, listRef, itemRefs]);

  return {
    getMostVisibleIdx,
    saveScrollPosition,
    readSavedScrollIndex,
  };
}
