import { useCallback, useMemo, useRef, useState } from 'react';

export default function useTagFilters(initial = { include: [], exclude: [] }) {
    const [includeSet, setIncludeSet] = useState(() => new Set(initial.include || []));
    const [excludeSet, setExcludeSet] = useState(() => new Set(initial.exclude || []));
    const include = useMemo(() => Array.from(includeSet), [includeSet]);
    const exclude = useMemo(() => Array.from(excludeSet), [excludeSet]);
    const includeLowerSet = useMemo(() => new Set(include.map((t) => String(t).toLowerCase())), [include]);
    const excludeLowerSet = useMemo(() => new Set(exclude.map((t) => String(t).toLowerCase())), [exclude]);
    const tagCacheRef = useRef(new WeakMap());

    const getActiveFilters = useCallback(() => ({ include, exclude }), [include, exclude]);

    const toggleInclude = useCallback((tag) => {
        setIncludeSet((prev) => {
            const next = new Set(prev);
            if (next.has(tag)) next.delete(tag);
            else next.add(tag);
            return next;
        });

        setExcludeSet((prev) => {
            if (!prev.has(tag)) return prev;
            const next = new Set(prev);
            next.delete(tag);
            return next;
        });
    }, []);

    const toggleExclude = useCallback((tag) => {
        setExcludeSet((prev) => {
            const next = new Set(prev);
            if (next.has(tag)) next.delete(tag);
            else next.add(tag);
            return next;
        });

        setIncludeSet((prev) => {
            if (!prev.has(tag)) return prev;
            const next = new Set(prev);
            next.delete(tag);
            return next;
        });
    }, []);

    const setInclude = useCallback((arr) => setIncludeSet(new Set(arr || [])), []);
    const setExclude = useCallback((arr) => setExcludeSet(new Set(arr || [])), []);

    const clear = useCallback(() => {
        setIncludeSet(new Set());
        setExcludeSet(new Set());
    }, []);

    const normalize = (s) => String(s).trim().toLowerCase();

    const parseTags = (raw) => {
        const list = Array.isArray(raw) ? raw : String(raw || '').split(/,|;/);
        return new Set(list.map((t) => normalize(t)).filter(Boolean));
    };

    const matchesItem = useCallback(
        (item) => {
            const rawTags = (item && (item.tags || item.tagList)) || [];
            let tagSet;
            if (item && typeof item === 'object') {
                const cache = tagCacheRef.current;
                const cached = cache.get(item);

                if (cached && cached.raw === rawTags) {
                    tagSet = cached.set;
                } else {
                    tagSet = parseTags(rawTags);
                    try {
                        cache.set(item, { raw: rawTags, set: tagSet });
                    } catch (e) {

                    }
                }
            } else {
                tagSet = parseTags(rawTags);
            }

            for (const ex of excludeLowerSet) {
                if (tagSet.has(ex)) return false;
            }
            for (const inc of includeLowerSet) {
                if (!tagSet.has(inc)) return false;
            }

            return true;
        },
        [includeLowerSet, excludeLowerSet]
    );

    return {
        include,
        exclude,
        toggleInclude,
        toggleExclude,
        setInclude,
        setExclude,
        clear,
        matchesItem,
        getActiveFilters,
    };
}
