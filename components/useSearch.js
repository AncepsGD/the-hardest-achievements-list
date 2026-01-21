import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { normalizeForSearch } from './enhanceAchievement';

export default function useSearch(
    achievements = [],
    search = '',
    filters = null,
    options = {}
) {
    const {
        debounceMs = 300,
        fuseOptions = {},
        setSearchCallback = null,
        onEditCommand = null,
        externalRefs = {},
    } = options;

    const searchInputRef = externalRefs.searchInputRef || useRef(null);
    const inputValueRef = externalRefs.inputValueRef || useRef(search);

    const lastJumpQueryRef = externalRefs.lastJumpQueryRef || useRef(null);
    const jumpCycleIndexRef = externalRefs.jumpCycleIndexRef || useRef(0);
    const searchJumpPendingRef = externalRefs.searchJumpPendingRef || useRef(false);
    const pendingSearchJumpRef = externalRefs.pendingSearchJumpRef || useRef(null);

    const normalizedSearch = useMemo(() => (search || '').trim().toLowerCase(), [search]);
    const [query, setQuery] = useState(normalizedSearch);
    const [isSearching, setIsSearching] = useState(false);
    const [manualSearch, setManualSearch] = useState('');
    const [debouncedManualSearch, setDebouncedManualSearch] = useState('');
    const SMALL_LIST_THRESHOLD = 200;
    useEffect(() => {
        setQuery(normalizedSearch);

        setIsSearching(false);
    }, [normalizedSearch]);
    useEffect(() => {
        setDebouncedManualSearch((manualSearch || '').trim().toLowerCase());
    }, [manualSearch]);

    useEffect(() => {
        const el = searchInputRef.current;
        if (el && el.value !== search) {
            el.value = search;
            inputValueRef.current = search;
        }
    }, [search]);

    const handleVisibleInputChange = useCallback(
        e => {
            const val = e.target.value;
            inputValueRef.current = val;
            setSearchCallback?.(val);

            lastJumpQueryRef.current = null;
            jumpCycleIndexRef.current = 0;
        },
        [setSearchCallback]
    );

    const handleSearchKeyDown = useCallback(
        e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();

            const raw = e.target.value.trim();
            if (!raw) return;
            const normalizedRaw = raw.toLowerCase();

            if (raw === 'edit') {
                onEditCommand?.();
                setSearchCallback?.('');
                e.target.blur();
                return;
            }

            jumpCycleIndexRef.current =
                lastJumpQueryRef.current === normalizedRaw
                    ? jumpCycleIndexRef.current + 1
                    : 0;

            lastJumpQueryRef.current = normalizedRaw;
            searchJumpPendingRef.current = true;
            pendingSearchJumpRef.current = normalizedRaw;

            e.target.blur();
        },
        [onEditCommand, setSearchCallback]
    );

    const indexed = useMemo(() => {
        if (!Array.isArray(achievements)) return [];

        return achievements.map(a => {
            const rawTags = a.tags || a.tagList || [];
            const tagArray = Array.isArray(rawTags)
                ? rawTags
                : String(rawTags).split(/[,;]/);

            const tagSet = new Set(
                tagArray
                    .map(t => t.trim().toLowerCase())
                    .filter(Boolean)
            );

            const text =
                normalizeForSearch(a) +
                ' ' +
                (a.title || '') +
                ' ' +
                (a.description || '');

            return {
                ...a,
                _searchText: text.toLowerCase(),
                _tagSet: tagSet,
            };
        });
    }, [achievements]);

    const normalizedFilters = useMemo(() => {
        if (!filters) return null;

        return {
            include: (filters.include || []).map(t => t.toLowerCase()),
            exclude: (filters.exclude || []).map(t => t.toLowerCase()),
            matchesItem: filters.matchesItem || null,
        };
    }, [filters]);
    const originalMap = useMemo(() => {
        const m = new Map();
        if (Array.isArray(achievements)) {
            for (const a of achievements) {
                const key = a && a.id != null ? String(a.id) : undefined;
                if (key !== undefined) m.set(key, a);
            }
        }
        return m;
    }, [achievements]);

    const matchesFilter = useCallback(
        item => {
            if (!normalizedFilters) return true;

            if (normalizedFilters.matchesItem) {

                const orig = originalMap.get(item.id);
                return normalizedFilters.matchesItem(orig || item);
            }

            const tags = item._tagSet;

            for (const t of normalizedFilters.exclude) {
                if (tags.has(t)) return false;
            }

            for (const t of normalizedFilters.include) {
                if (!tags.has(t)) return false;
            }

            return true;
        },
        [normalizedFilters, originalMap]
    );
    const searchIndex = useMemo(() => {
        if (!Array.isArray(achievements)) return [];

        return achievements.map(a => {
            const rawTags = a.tags || a.tagList || [];
            const tagArray = Array.isArray(rawTags) ? rawTags : String(rawTags).split(/[,;]/);

            const tagSet = new Set(
                tagArray
                    .map(t => t.trim().toLowerCase())
                    .filter(Boolean)
            );

            const text = normalizeForSearch(a) + ' ' + (a.title || '') + ' ' + (a.description || '');

            return {
                id: a && a.id != null ? String(a.id) : undefined,
                title: (a.title || ''),
                description: (a.description || ''),
                _searchText: text.toLowerCase(),
                _tagSet: tagSet,
            };
        }).filter(item => item.id !== undefined);
    }, [achievements]);
    const fuseOptsStable = useMemo(() => ({
        threshold: 0.4,
        includeScore: false,
        keys: [
            { name: 'title', weight: 0.7 },
            { name: 'description', weight: 0.3 },
        ],
        ...fuseOptions,
    }), [JSON.stringify(fuseOptions || {})]);
    const filteredIndexed = useMemo(() => {
        if (!searchIndex.length) return [];
        return searchIndex.filter(matchesFilter);
    }, [searchIndex, matchesFilter]);

    const fuseForFiltered = useMemo(() => {
        if (!filteredIndexed.length) return null;

        if (filteredIndexed.length < SMALL_LIST_THRESHOLD) return null;
        return new Fuse(filteredIndexed, fuseOptsStable);
    }, [filteredIndexed, fuseOptsStable]);
    const workerRef = useRef(null);
    const workerAvailableRef = useRef(false);
    const workerRequestSeq = useRef(0);
    const pendingRequests = useRef(new Map());
    const [workerResultIds, setWorkerResultIds] = useState(null);

    useEffect(() => {

        const workerCode = `
            self.onmessage = function(e) {
                try {
                    const msg = e.data;
                    if (msg && msg.type === 'index') {
                        self._items = msg.items || [];
                        self._opts = msg.fuseOpts || {};
                        if (typeof importScripts === 'function' && !self.Fuse) {
                            try {
                                importScripts('https://cdn.jsdelivr.net/npm/fuse.js/dist/fuse.min.js');
                            } catch (err) {

                            }
                        }
                        if (typeof self.Fuse !== 'undefined' && self._items) {
                            try {
                                self._fuse = new self.Fuse(self._items, self._opts);
                            } catch (err) {
                                self._fuse = null;
                            }
                        }
                    } else if (msg && msg.type === 'search') {
                        const q = msg.query || '';
                        const include = msg.include || [];
                        const exclude = msg.exclude || [];
                        const reqId = msg.requestId;
                        let pool = (self._items || []).filter(item => {
                            const tags = item._tagSet || new Set();
                            for (const t of exclude) if (tags.has(t)) return false;
                            for (const t of include) if (!tags.has(t)) return false;
                            return true;
                        });
                        if (!q) {
                            const ids = pool.map(it => it.id).filter(Boolean);
                            postMessage({ type: 'results', requestId: reqId, ids });
                            return;
                        }
                        const cheap = pool.filter(it => (it._searchText || '').includes(q)).map(it => it.id);
                        if (cheap.length) {
                            postMessage({ type: 'results', requestId: reqId, ids: cheap });
                            return;
                        }
                        if (pool.length < ${SMALL_LIST_THRESHOLD}) {
                            const tokens = (q || '').split(/\s+/).filter(Boolean);
                            const matches = pool.filter(item => {
                                const text = item._searchText || '';
                                for (const t of tokens) if (!text.includes(t)) return false;
                                return true;
                            }).map(it => it.id);
                            postMessage({ type: 'results', requestId: reqId, ids: matches });
                            return;
                        }
                        if (self._fuse) {
                            try {
                                const res = self._fuse.search(q).map(r => r.item && r.item.id).filter(Boolean);
                                postMessage({ type: 'results', requestId: reqId, ids: res });
                                return;
                            } catch (err) {
                                postMessage({ type: 'results', requestId: reqId, ids: [] });
                                return;
                            }
                        }

                        postMessage({ type: 'results', requestId: reqId, ids: [] });
                    }
                } catch (e) {

                    try { postMessage({ type: 'error', error: String(e) }); } catch (_) {}
                }
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        let w;
        try {
            w = new Worker(url);
            workerRef.current = w;
            workerAvailableRef.current = true;

            w.onmessage = function (ev) {
                const m = ev.data || {};
                if (m.type === 'results' && m.requestId != null) {
                    const cb = pendingRequests.current.get(m.requestId);
                    if (cb) {
                        pendingRequests.current.delete(m.requestId);
                        cb(m.ids || []);
                    }
                }
            };
            w.onerror = function () { workerAvailableRef.current = false; };
        } catch (err) {
            workerAvailableRef.current = false;
        }

        return () => {
            try { if (workerRef.current) workerRef.current.terminate(); } catch (_) { }
            URL.revokeObjectURL(url);
            workerRef.current = null;
            workerAvailableRef.current = false;
            pendingRequests.current.clear();
        };
    }, []);
    useEffect(() => {
        const w = workerRef.current;
        if (w && workerAvailableRef.current) {
            w.postMessage({ type: 'index', items: searchIndex, fuseOpts: fuseOptsStable });
        }
    }, [searchIndex, fuseOptsStable]);
    useEffect(() => {
        let cancelled = false;
        const w = workerRef.current;
        const reqId = ++workerRequestSeq.current;

        const handleIds = ids => {
            if (cancelled) return;
            setWorkerResultIds(ids || []);
            setIsSearching(false);
        };

        setIsSearching(true);

        if (w && workerAvailableRef.current) {
            pendingRequests.current.set(reqId, handleIds);
            w.postMessage({ type: 'search', query, include: normalizedFilters ? normalizedFilters.include : [], exclude: normalizedFilters ? normalizedFilters.exclude : [], requestId: reqId });
        } else {

            (async () => {
                const toOrig = idxItem => originalMap.get(idxItem.id) || null;
                if (!query) {
                    const resIds = filteredIndexed.map(it => it.id).filter(Boolean);
                    if (!cancelled) { setWorkerResultIds(resIds); setIsSearching(false); }
                    return;
                }
                const cheapMatchesIds = filteredIndexed.filter(it => it._searchText.includes(query)).map(it => it.id);
                if (cheapMatchesIds.length) {
                    if (!cancelled) { setWorkerResultIds(cheapMatchesIds); setIsSearching(false); }
                    return;
                }
                if (filteredIndexed.length < SMALL_LIST_THRESHOLD) {
                    const tokens = (query || '').split(/\s+/).filter(Boolean);
                    const tokenMatches = filteredIndexed.filter(item => {
                        const text = item._searchText || '';
                        for (const t of tokens) if (!text.includes(t)) return false;
                        return true;
                    }).map(it => it.id);
                    if (!cancelled) { setWorkerResultIds(tokenMatches); setIsSearching(false); }
                    return;
                }

                const resIds = fuseForFiltered.search(query).map(r => r.item && r.item.id).filter(Boolean);
                if (!cancelled) { setWorkerResultIds(resIds); setIsSearching(false); }
            })();
        }

        return () => { cancelled = true; };
    }, [query, filteredIndexed, fuseForFiltered, originalMap, normalizedFilters]);
    const results = useMemo(() => {
        const ids = workerResultIds || [];
        return ids.map(id => originalMap.get(id)).filter(Boolean);
    }, [workerResultIds, originalMap]);

    return {
        results,
        isSearching,
        noMatches: !isSearching && results.length === 0,
        query,
        searchInputRef,
        inputValueRef,
        handleSearchKeyDown,
        handleVisibleInputChange,
        manualSearch,
        setManualSearch,
        debouncedManualSearch,
        searchJumpPendingRef,
        lastJumpQueryRef,
        jumpCycleIndexRef,
        pendingSearchJumpRef,
    };
}
