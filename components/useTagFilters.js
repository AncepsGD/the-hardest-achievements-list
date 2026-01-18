import { useCallback, useMemo, useState } from 'react';
export default function useTagFilters(initial = { include: [], exclude: [] }) {
    const [includeSet, setIncludeSet] = useState(() => new Set(initial.include || []));
    const [excludeSet, setExcludeSet] = useState(() => new Set(initial.exclude || []));

    const getActiveFilters = useCallback(() => ({
        include: Array.from(includeSet),
        exclude: Array.from(excludeSet),
    }), [includeSet, excludeSet]);

    const toggleInclude = useCallback((tag) => {
        setIncludeSet((prev) => {
            const next = new Set(prev);
            if (next.has(tag)) next.delete(tag);
            else {
                next.add(tag);
            }
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

    const matchesItem = useCallback(
        (item) => {
            const tags = (item && (item.tags || item.tagList)) || [];

            const tagSet = new Set((Array.isArray(tags) ? tags : String(tags).split(/,|;/)).map((t) => String(t).trim().toLowerCase()).filter(Boolean));

            for (const ex of excludeSet) {
                if (tagSet.has(String(ex).toLowerCase())) return false;
            }
            for (const inc of includeSet) {
                if (!tagSet.has(String(inc).toLowerCase())) return false;
            }

            return true;
        },
        [includeSet, excludeSet]
    );

    return {
        include: Array.from(includeSet),
        exclude: Array.from(excludeSet),
        toggleInclude,
        toggleExclude,
        setInclude,
        setExclude,
        clear,
        matchesItem,
        getActiveFilters,
    };
}
