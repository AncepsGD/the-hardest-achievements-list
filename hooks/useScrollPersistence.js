import { useEffect, useRef, useState } from 'react';

export function useScrollPersistence({
  storageKey,
  items = [],
  devMode = false,
  listRef = null,
  itemRefs = null,
  setScrollToIdx = null,
  setHighlightedIdx = null,
}) {
  const [restoredScroll, setRestoredScroll] = useState(null);
  const lastSavedIdxRef = useRef(null);
  const rafRef = useRef(null);
  const saveIdleRef = useRef(null);
  const scrollListenerRef = useRef(null);

  const getMostVisibleIdx = () => {
    if (!itemRefs || !itemRefs.current) return null;
    let maxVisible = 0;
    let bestIdx = null;

    itemRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const rect = ref.getBoundingClientRect();
      const visible = Math.max(
        0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
      );
      if (visible > maxVisible) {
        maxVisible = visible;
        bestIdx = idx;
      }
    });

    return bestIdx;
  };

  const saveScrollPosition = (pos) => {
    try {
      if (typeof window === 'undefined') return;

      if (!pos || pos.index === null || pos.index === undefined) {
        localStorage.removeItem(storageKey);
      } else {
        const out = { index: Number(pos.index) };
        if (pos.offset !== undefined && pos.offset !== null) {
          out.offset = Number(pos.offset);
        }
        out.ts = Date.now();
        localStorage.setItem(storageKey, JSON.stringify(out));
      }
    } catch (e) {
    }
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
    const computeMostVisibleIdxForContainer = (container) => {
      try {
        const rect = container.getBoundingClientRect();
        const x = rect.left + 10;
        const y = rect.top + (container.clientHeight || rect.height) / 2;
        if (typeof document.elementsFromPoint === 'function') {
          const els = document.elementsFromPoint(x, y);
          for (const el of els) {
            if (!el) continue;
            try {
              const ai = el.getAttribute && el.getAttribute('data-index');
              if (ai != null) return Number(ai);

              let p = el.parentElement;
              while (p) {
                const pi = p.getAttribute && p.getAttribute('data-index');
                if (pi != null) return Number(pi);
                p = p.parentElement;
              }
            } catch (e) { }
          }
        }
        const visible = Array.from(container.querySelectorAll('[data-index]'));
        let best = null;
        let bestVisible = 0;
        for (const el of visible) {
          const r = el.getBoundingClientRect();
          const vis = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
          if (vis > bestVisible) {
            bestVisible = vis;
            best = el;
          }
        }
        if (best) return Number(best.getAttribute('data-index'));
      } catch (e) { }
      return null;
    };

    const computeAndSave = () => {
      try {
        let idx = null;
        let offset = null;
        const lr = listRef && listRef.current;
        if (lr) {
          const container = lr._outerRef || lr.outerRef || lr._listRef || lr._scrollingContainer || lr;
          if (container) {
            offset = (typeof container.scrollTop === 'number') ? container.scrollTop : (window.pageYOffset || window.scrollY || 0);
            const candidate = computeMostVisibleIdxForContainer(container);
            if (candidate != null) idx = candidate;
          }
        }

        if (idx == null && itemRefs && itemRefs.current) {
          idx = getMostVisibleIdx();
          offset = window.pageYOffset || window.scrollY || 0;
        }

        if (idx !== null && idx !== undefined) {
          if (lastSavedIdxRef.current === idx && typeof offset === 'number') {
          }
          lastSavedIdxRef.current = idx;
          saveScrollPosition({ index: idx, offset });
        }
      } catch (e) { }
    };
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        try {
          const lr = listRef && listRef.current;
          let container = lr && (lr._outerRef || lr.outerRef || lr._listRef || lr._scrollingContainer) || null;
          if (!container && lr) container = lr;

          if (container) {
            const midIdx = computeMostVisibleIdxForContainer(container);
            pendingIdxRef.current = { idx: midIdx, offset: (typeof container.scrollTop === 'number') ? container.scrollTop : (window.pageYOffset || window.scrollY || 0) };
          } else if (itemRefs && itemRefs.current) {
            const midIdx = getMostVisibleIdx();
            pendingIdxRef.current = { idx: midIdx, offset: window.pageYOffset || window.scrollY || 0 };
          }
        } catch (e) { }
      });

      if (saveIdleRef.current) clearTimeout(saveIdleRef.current);
      saveIdleRef.current = setTimeout(() => {
        try {
          const pending = pendingIdxRef.current || null;
          if (pending && pending.idx != null) {
            lastSavedIdxRef.current = pending.idx;
            saveScrollPosition({ index: pending.idx, offset: pending.offset });
          } else {
            computeAndSave();
          }
        } catch (e) { }
      }, 1000);
    };
    const attachTarget = () => {
      if (devMode) return window;
      const lr = listRef && listRef.current;
      if (!lr) return window;
      return lr._outerRef || lr.outerRef || lr._listRef || lr._scrollingContainer || lr;
    };

    const target = attachTarget();
    try {
      if (target && target.addEventListener) {
        target.addEventListener('scroll', onScroll, { passive: true });
        scrollListenerRef.current = { target, handler: onScroll };
      }
    } catch (e) { }
    try { computeAndSave(); } catch (e) { }

    const onUnload = () => {
      try {
        const pending = pendingIdxRef.current || null;
        if (pending && pending.idx != null) saveScrollPosition({ index: pending.idx, offset: pending.offset });
        else computeAndSave();
      } catch (e) { }
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      try {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (saveIdleRef.current) clearTimeout(saveIdleRef.current);
        if (scrollListenerRef.current && scrollListenerRef.current.target && scrollListenerRef.current.handler) {
          try { scrollListenerRef.current.target.removeEventListener('scroll', scrollListenerRef.current.handler); } catch (e) { }
        }
        window.removeEventListener('beforeunload', onUnload);
      } catch (e) { }
    };
  }, [devMode, listRef, itemRefs, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (items.length === 0) return;

    const saved = readSavedScrollIndex();
    if (saved === null) return;

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
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              try {
                const top = Math.max(
                  0,
                  Math.min(Number(offset), container.scrollHeight || Number(offset))
                );
                container.scrollTop = top;
              } catch (e) {
              }
            })
          );
        }
      } else if (itemRefs && itemRefs.current && itemRefs.current[index]) {
        const el = itemRefs.current[index];
        if (el && typeof el.getBoundingClientRect === 'function') {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              try {
                const savedAbsoluteTop = Number(offset);
                window.scrollTo({ top: savedAbsoluteTop, left: 0, behavior: 'auto' });
              } catch (e) {
              }
            })
          );
        }
      }
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
