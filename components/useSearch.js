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

    const debounceRef = useRef(null);
    const [query, setQuery] = useState(search);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        clearTimeout(debounceRef.current);
        setIsSearching(true);

        debounceRef.current = setTimeout(() => {
            setQuery(search.trim().toLowerCase());
            setIsSearching(false);
        }, debounceMs);

        return () => clearTimeout(debounceRef.current);
    }, [search, debounceMs]);

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

            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                setSearchCallback?.(val);
            }, 120);

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

            if (raw === 'edit') {
                onEditCommand?.();
                setSearchCallback?.('');
                e.target.blur();
                return;
            }

            jumpCycleIndexRef.current =
                lastJumpQueryRef.current === raw
                    ? jumpCycleIndexRef.current + 1
                    : 0;

            lastJumpQueryRef.current = raw;
            searchJumpPendingRef.current = true;
            pendingSearchJumpRef.current = raw;

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

    const matchesFilter = useCallback(
        item => {
            if (!normalizedFilters) return true;

            if (normalizedFilters.matchesItem) {
                return normalizedFilters.matchesItem(item);
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
        [normalizedFilters]
    );

    const fuse = useMemo(() => {
        if (!indexed.length) return null;

        return new Fuse(indexed, {
            threshold: 0.4,
            includeScore: false,
            keys: [
                { name: 'title', weight: 0.7 },
                { name: 'description', weight: 0.3 },
            ],
            ...fuseOptions,
        });
    }, [indexed, fuseOptions]);

    const results = useMemo(() => {
        if (!query) {
            return indexed.filter(matchesFilter);
        }

        const cheapMatches = indexed.filter(
            it => it._searchText.includes(query) && matchesFilter(it)
        );

        if (cheapMatches.length || !fuse) {
            return cheapMatches;
        }

        return fuse.search(query).map(r => r.item).filter(matchesFilter);
    }, [query, indexed, fuse, matchesFilter]);

    return {
        results,
        isSearching,
        noMatches: !isSearching && results.length === 0,
        query,
        searchInputRef,
        inputValueRef,
        handleSearchKeyDown,
        handleVisibleInputChange,
        searchJumpPendingRef,
        lastJumpQueryRef,
        jumpCycleIndexRef,
        pendingSearchJumpRef,
    };
}
