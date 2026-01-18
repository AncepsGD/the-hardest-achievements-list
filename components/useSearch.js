import { useCallback, useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { normalizeForSearch } from './enhanceAchievement';
export default function useSearch(achievements = [], search = '', filters = null, options = {}) {
    const { debounceMs = 300, fuseOptions = {} } = options;

    const [debouncedQuery, setDebouncedQuery] = useState(search || '');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        let mounted = true;
        setIsSearching(true);
        const t = setTimeout(() => {
            if (!mounted) return;
            setDebouncedQuery(search || '');
            setIsSearching(false);
        }, debounceMs);
        return () => {
            mounted = false;
            clearTimeout(t);
        };
    }, [search, debounceMs]);

    const indexed = useMemo(() => {
        if (!Array.isArray(achievements)) return [];
        return achievements.map((a) => {
            const norm = normalizeForSearch(a) || '';
            return Object.assign({}, a, { _searchText: norm });
        });
    }, [achievements]);

    const fuse = useMemo(() => {
        const defaultOpts = {
            includeScore: true,
            threshold: 0.4,
            keys: [
                { name: 'title', weight: 0.7 },
                { name: 'description', weight: 0.3 },
                { name: '_searchText', weight: 0.1 },
            ],
        };
        try {
            return new Fuse(indexed, Object.assign({}, defaultOpts, fuseOptions));
        } catch (e) {
            return new Fuse(indexed, defaultOpts);
        }
    }, [indexed, JSON.stringify(fuseOptions)]);

    const matchesFilter = useCallback(
        (item) => {
            if (!filters) return true;
            if (typeof filters.matchesItem === 'function') return filters.matchesItem(item);

            const inc = (filters.include || []).map((t) => String(t).toLowerCase());
            const exc = (filters.exclude || []).map((t) => String(t).toLowerCase());
            const tags = (item && (item.tags || item.tagList)) || [];
            const tagSet = new Set((Array.isArray(tags) ? tags : String(tags).split(/,|;/)).map((t) => String(t).trim().toLowerCase()).filter(Boolean));
            for (const e of exc) if (tagSet.has(e)) return false;
            for (const i of inc) if (!tagSet.has(i)) return false;
            return true;
        },
        [filters]
    );

    const results = useMemo(() => {
        const q = (debouncedQuery || '').trim();
        if (!q) {
            return (achievements || []).filter(matchesFilter);
        }

        try {
            const fuseRes = fuse.search(q);
            const items = fuseRes.map((r) => (r && r.item) || r);
            return items.filter(matchesFilter);
        } catch (e) {

            const qn = q.toLowerCase();
            return (indexed || []).filter((it) => {
                const t = String(it._searchText || '') + ' ' + String(it.title || '') + ' ' + String(it.description || '');
                return t.toLowerCase().includes(qn) && matchesFilter(it);
            });
        }
    }, [debouncedQuery, fuse, indexed, achievements, matchesFilter]);

    const noMatches = !isSearching && Array.isArray(results) && results.length === 0;

    return {
        results,
        isSearching,
        noMatches,
        query: debouncedQuery,
    };
}
