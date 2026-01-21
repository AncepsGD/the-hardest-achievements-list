import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { normalizeForSearch } from './enhanceAchievement';

export default function useSearch(achievements = [], search = '', filters = null, options = {}) {
    const { debounceMs = 300, fuseOptions = {} } = options;

    const [debouncedQuery, setDebouncedQuery] = useState(search);
    const [isSearching, setIsSearching] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        setIsSearching(true);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedQuery(search || '');
            setIsSearching(false);
        }, debounceMs);
        return () => clearTimeout(debounceRef.current);
    }, [search, debounceMs]);

    const indexed = useMemo(() => {
        if (!Array.isArray(achievements)) return [];
        return achievements.map(a => {
            const tags = a?.tags || a?.tagList || [];
            const tagArr = Array.isArray(tags)
                ? tags
                : String(tags).split(/,|;/);
            const tagSet = new Set(
                tagArr.map(t => String(t).trim().toLowerCase()).filter(Boolean)
            );

            const searchText =
                normalizeForSearch(a) +
                ' ' +
                (a.title || '') +
                ' ' +
                (a.description || '');

            return {
                ...a,
                _searchText: searchText.toLowerCase(),
                _tagSet: tagSet,
            };
        });
    }, [achievements]);

    const fuse = useMemo(() => {
        if (!indexed.length) return null;
        return new Fuse(indexed, {
            includeScore: false,
            threshold: 0.4,
            keys: [
                { name: 'title', weight: 0.7 },
                { name: 'description', weight: 0.3 },
                { name: '_searchText', weight: 0.1 },
            ],
            ...fuseOptions,
        });
    }, [indexed, fuseOptions]);

    const matchesFilter = useCallback(
        item => {
            if (!filters) return true;
            if (typeof filters.matchesItem === 'function') {
                return filters.matchesItem(item);
            }

            const inc = filters.include || [];
            const exc = filters.exclude || [];
            const tagSet = item._tagSet;

            for (let i = 0; i < exc.length; i++) {
                if (tagSet.has(String(exc[i]).toLowerCase())) return false;
            }
            for (let i = 0; i < inc.length; i++) {
                if (!tagSet.has(String(inc[i]).toLowerCase())) return false;
            }
            return true;
        },
        [filters]
    );

    const results = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase();
        if (!q) {
            return indexed.filter(matchesFilter);
        }

        if (fuse) {
            return fuse.search(q).map(r => r.item).filter(matchesFilter);
        }

        return indexed.filter(
            it => it._searchText.includes(q) && matchesFilter(it)
        );
    }, [debouncedQuery, indexed, fuse, matchesFilter]);

    return {
        results,
        isSearching,
        noMatches: !isSearching && results.length === 0,
        query: debouncedQuery,
    };
}
