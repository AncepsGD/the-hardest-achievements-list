import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeForSearch } from './enhanceAchievement';

export default function useSearch(
    achievements = [],
    search = '',
    filters = null,
    options = {}
) {
    const {
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
            if (!val || !(String(val || '').trim())) {
                setQuery('');
                setIsSearching(false);
            } else if (!setSearchCallback) {
                const normalizedVal = (val || '').trim().toLowerCase();
                setQuery(normalizedVal);
                setIsSearching(false);
            }

            lastJumpQueryRef.current = null;
            jumpCycleIndexRef.current = 0;
        },
        [setSearchCallback, setQuery, setIsSearching]
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

            const tagsArr = item._tags || [];

            for (const t of normalizedFilters.exclude) {
                if (tagsArr.indexOf(t) !== -1) return false;
            }

            for (const t of normalizedFilters.include) {
                if (tagsArr.indexOf(t) === -1) return false;
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

            const tagArrayNormalized = tagArray
                .map(t => t.trim().toLowerCase())
                .filter(Boolean);

            const name = a && (a.name || a.title) ? String(a.name || a.title) : '';
            const player = a && a.player ? String(a.player) : '';
            const description = a && a.description ? String(a.description) : '';
            const idStr = a && a.id != null ? String(a.id) : '';
            const searchableNormalized = (a && a._searchableNormalized) || normalizeForSearch(`${name} ${player} ${description} ${idStr}`);
            const text = searchableNormalized + ' ' + name + ' ' + player + ' ' + description;

            return {
                id: a && a.id != null ? String(a.id) : undefined,
                title: (name || ''),
                description: (description || player || ''),
                _searchText: (text || '').toLowerCase(),
                _tags: tagArrayNormalized,
            };
        }).filter(item => item.id !== undefined);
    }, [achievements]);
    const filteredIndexed = useMemo(() => {
        if (!searchIndex.length) return [];
        return searchIndex.filter(matchesFilter);
    }, [searchIndex, matchesFilter]);
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
                    } else if (msg && msg.type === 'search') {
                        const q = msg.query || '';
                        const include = msg.include || [];
                        const exclude = msg.exclude || [];
                        const reqId = msg.requestId;
                        let pool = (self._items || []).filter(item => {
                            const tags = item._tags || [];
                            for (const t of exclude) if (tags.indexOf(t) !== -1) return false;
                            for (const t of include) if (tags.indexOf(t) === -1) return false;
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
                        const tokens = (q || '').split(/\s+/).filter(Boolean);
                        const matches = pool.filter(item => {
                            const text = item._searchText || '';
                            for (const t of tokens) if (!text.includes(t)) return false;
                            return true;
                        }).map(it => it.id);
                        postMessage({ type: 'results', requestId: reqId, ids: matches });
                        return;
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
            w.postMessage({ type: 'index', items: searchIndex });
        }
    }, [searchIndex]);
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
                const tokens = (query || '').split(/\s+/).filter(Boolean);
                const tokenMatches = filteredIndexed.filter(item => {
                    const text = item._searchText || '';
                    for (const t of tokens) if (!text.includes(t)) return false;
                    return true;
                }).map(it => it.id);
                if (!cancelled) { setWorkerResultIds(tokenMatches); setIsSearching(false); }
            })();
        }

        return () => { cancelled = true; };
    }, [query, filteredIndexed, originalMap, normalizedFilters]);
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
