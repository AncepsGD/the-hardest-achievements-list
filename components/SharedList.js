import Head from 'next/head';
import React, { useEffect, useState, useMemo, useRef, useCallback, useTransition, memo } from 'react';
import { FixedSizeList as ListWindow } from 'react-window';
import Link from 'next/link';

import Sidebar from '../components/Sidebar';
import Background from '../components/Background';
import { useDateFormat } from '../components/DateFormatContext';
import { formatDate } from './formatDate';
import sharedListManager from './sharedListManager';
import Tag, { TAG_PRIORITY_ORDER } from '../components/Tag';
import TierTag, { getTierByRank } from '../components/TierSystem';
import DevModePanel from '../components/DevModePanel';
import { EditIcon, UpIcon, CopyIcon, DownIcon, AddIcon, DeleteIcon } from './DevIcons';
import MobileSidebarOverlay from '../components/MobileSidebarOverlay';
import { useScrollPersistence } from '../hooks/useScrollPersistence';
import useSortedList, { mulberry32 } from './useSortedList';
import { enhanceAchievement, mapEnhanceArray, getThumbnailUrl, normalizeForSearch, _makePasteSignature, _tokensFromNormalized } from './enhanceAchievement';
import useTagFilters from './useTagFilters';
import useSearch from './useSearch';

function TagFilterPillsInner({ allTags, filterTags, setFilterTags, isMobile, show }) {
  const tagStates = {};
  allTags.forEach(tag => {
    if ((filterTags && filterTags.include || []).includes(tag)) tagStates[tag] = 'include';
    else if ((filterTags && filterTags.exclude || []).includes(tag)) tagStates[tag] = 'exclude';
    else tagStates[tag] = 'neutral';
  });

  function handlePillClick(tag) {
    const state = tagStates[tag];
    const include = Array.isArray(filterTags.include) ? [...filterTags.include] : [];
    const exclude = Array.isArray(filterTags.exclude) ? [...filterTags.exclude] : [];

    if (state === 'neutral') {
      if (!include.includes(tag)) include.push(tag);
    } else if (state === 'include') {
      const idx = include.indexOf(tag); if (idx !== -1) include.splice(idx, 1);
      if (!exclude.includes(tag)) exclude.push(tag);
    } else if (state === 'exclude') {
      const idx = exclude.indexOf(tag); if (idx !== -1) exclude.splice(idx, 1);
    }

    setFilterTags({ include, exclude });
  }

  return (
    <div
      className="tag-filter-pills"
      style={{
        minHeight: 40,
        marginBottom: 16,
        display: isMobile ? (show ? 'flex' : 'none') : 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        transition: 'all 0.2s',
      }}
    >
      {allTags.length === 0 ? (
        <span style={{ color: '#aaa', fontSize: 13 }}>Loading tags...</span>
      ) : (
        allTags.sort((a, b) => (TAG_PRIORITY_ORDER.indexOf(a.toUpperCase()) - TAG_PRIORITY_ORDER.indexOf(b.toUpperCase()))).map(tag => (
          <Tag
            key={tag}
            tag={tag}
            state={tagStates[tag]}
            onClick={() => handlePillClick(tag)}
            tabIndex={0}
            clickable={true}
          />
        ))
      )}
    </div>
  );
};

function parseAsLocal(d) {
  if (!d) return null;
  const s = String(d).trim();
  if (s.includes('?')) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(s + 'T00:00:00');
    }
    const parsed = new Date(s);
    if (isNaN(parsed)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function calculateDaysLasted(currentDate, previousDate) {
  if (!currentDate || !previousDate) return 'N/A';
  const current = parseAsLocal(currentDate);
  const previous = parseAsLocal(previousDate);
  if (!current || !previous || isNaN(current) || isNaN(previous)) return 'N/A';
  const diffTime = Math.abs(current - previous);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function shouldShowTier(tier, mode, usePlatformers, showTiers) {
  try {
    if (!tier) return false;
    if (showTiers !== true) return false;
    if (mode === 'timeline') return false;
    if (usePlatformers) return false;
    return true;
  } catch (e) { return false; }
}

function TimelineAchievementCardInner({ achievement, previousAchievement, onHoverEnter, onHoverLeave, devMode, autoThumbAvailable, totalAchievements, achievements = [], showTiers = false, mode = '', usePlatformers = false, extraLists = {}, listType = 'main' }) {
  const { dateFormat } = useDateFormat();
  const tier = getTierByRank(achievement && achievement.rank, totalAchievements, achievements, { enable: showTiers === true, listType });
  const isPlatformer = achievement && typeof achievement._isPlatformer === 'boolean' ? achievement._isPlatformer : ((achievement && Array.isArray(achievement.tags)) ? achievement.tags.some(t => String(t).toLowerCase() === 'platformer') : false);
  const handleClick = e => {
    if (devMode) {
      if (e.ctrlKey || e.button === 1) return;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  let lastedLabel;
  if (previousAchievement && previousAchievement.date && achievement && achievement.date) {
    const days = calculateDaysLasted(achievement.date, previousAchievement.date);
    lastedLabel = typeof days === 'number' ? `Lasted ${days} days` : 'Lasted N/A days';
  } else {

    const today = new Date();
    const achievementDate = parseAsLocal(achievement && achievement.date);
    if (!achievement || !achievement.date || !achievementDate || isNaN(achievementDate)) {
      lastedLabel = 'Lasting N/A days';
    } else {
      const diffTime = Math.abs(today - achievementDate);
      const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      lastedLabel = `Lasting ${days} days`;
    }
  }

  return (
    <Link href={`/achievement/${achievement.id}`} passHref legacyBehavior>
      <a
        style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
        onClick={handleClick}
        onClickCapture={(e) => { if (devMode) { try { e.preventDefault(); e.stopPropagation(); } catch (err) { } } }}
        onMouseDown={handleClick}
        onKeyDown={(e) => { if (devMode && (e.key === 'Enter' || e.key === ' ')) { try { e.preventDefault(); e.stopPropagation(); } catch (err) { } } }}
        tabIndex={devMode ? -1 : 0}
        aria-disabled={devMode ? 'true' : undefined}
      >
        <div
          className={`achievement-item`}
          tabIndex={0}
          style={{ cursor: 'pointer', position: 'relative' }}
          onMouseEnter={(e) => { if (typeof onHoverEnter === 'function') onHoverEnter(e); }}
          onMouseLeave={(e) => { if (typeof onHoverLeave === 'function') onHoverLeave(e); }}
          onFocus={(e) => { if (typeof onHoverEnter === 'function') onHoverEnter(e); }}
          onBlur={(e) => { if (typeof onHoverLeave === 'function') onHoverLeave(e); }}
        >
          <div className="rank-date-container">
            {!isPlatformer && (
              <div className="achievement-length">
                {achievement && (achievement._lengthStr || achievement.length === 0) ? (achievement._lengthStr || (achievement.length ? `${Math.floor(achievement.length / 60)}:${(achievement.length % 60).toString().padStart(2, '0')}` : 'N/A')) : 'N/A'}
              </div>
            )}
            <div className="lasted-days">{lastedLabel}</div>
            <div className="achievement-date"><strong>{achievement.date ? formatDate(achievement.date, dateFormat) : 'N/A'}</strong></div>
          </div>
          <div className="tag-container">
            {(achievement._sortedTags || []).map(tag => (
              <Tag tag={tag} key={tag} />
            ))}
            {shouldShowTier(tier, mode, usePlatformers, showTiers) && (
              <TierTag tier={tier} totalAchievements={totalAchievements} achievements={achievements} extraLists={extraLists} />
            )}
          </div>
          <div className="achievement-details">
            <div className="text">
              <h2>{achievement.name}</h2>
              <p>{achievement.player}</p>
            </div>
            <div className="thumbnail-container">
              <img src={(achievement && achievement._thumbnail) || getThumbnailUrl(achievement, false)} alt={achievement.name} loading="lazy" />
              {autoThumbAvailable && (
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>Automatic thumbnail applied</div>
              )}
            </div>
          </div>

        </div>
      </a>
    </Link>
  );
}

const TimelineAchievementCard = memo(TimelineAchievementCardInner, (prev, next) => {
  const pa = prev.achievement || {};
  const na = next.achievement || {};
  const sameId = (pa.id && na.id) ? String(pa.id) === String(na.id) : pa === na;
  return sameId
    && prev.devMode === next.devMode
    && prev.autoThumbAvailable === next.autoThumbAvailable
    && prev.showTiers === next.showTiers
    && prev.totalAchievements === next.totalAchievements
    && prev.mode === next.mode
    && prev.usePlatformers === next.usePlatformers
    && prev.listType === next.listType;
});

const AchievementCard = memo(function AchievementCard({ achievement, devMode, autoThumbAvailable, displayRank, showRank = true, totalAchievements, achievements = [], mode = '', usePlatformers = false, showTiers = false, extraLists = {}, listType = 'main', onHoverEnter, onHoverLeave }) {
  const { dateFormat } = useDateFormat();
  const isPlatformer = achievement && typeof achievement._isPlatformer === 'boolean' ? achievement._isPlatformer : ((achievement && Array.isArray(achievement.tags)) ? achievement.tags.some(t => String(t).toLowerCase() === 'platformer') : false);
  const tier = getTierByRank(achievement.rank, totalAchievements, achievements, { enable: showTiers === true, listType });


  const handleClick = e => {
    if (devMode) {
      if (e.ctrlKey || e.button === 1) return;
      e.preventDefault();
      e.stopPropagation();
    }
  };
  return (
    <Link href={`/achievement/${encodeURIComponent(achievement.id)}`} passHref legacyBehavior>
      <a
        style={{
          textDecoration: 'none',
          color: 'inherit',
          cursor: devMode ? 'not-allowed' : 'pointer',
        }}
        onClick={handleClick}
        onClickCapture={(e) => { if (devMode) { try { e.preventDefault(); e.stopPropagation(); } catch (err) { } } }}
        onMouseDown={handleClick}
        onKeyDown={(e) => { if (devMode && (e.key === 'Enter' || e.key === ' ')) { try { e.preventDefault(); e.stopPropagation(); } catch (err) { } } }}
        tabIndex={devMode ? -1 : 0}
        aria-disabled={devMode ? 'true' : undefined}
      >
        <div
          className="achievement-item"
          tabIndex={0}
          style={{ cursor: devMode ? 'not-allowed' : 'pointer', transition: 'opacity 0.1s', position: 'relative' }}
          onMouseEnter={(e) => { if (typeof onHoverEnter === 'function') onHoverEnter(e); }}
          onMouseLeave={(e) => { if (typeof onHoverLeave === 'function') onHoverLeave(e); }}
          onFocus={(e) => { if (typeof onHoverEnter === 'function') onHoverEnter(e); }}
          onBlur={(e) => { if (typeof onHoverLeave === 'function') onHoverLeave(e); }}
        >
          <div className="rank-date-container">
            {!isPlatformer && (
              <div className="achievement-length">
                {achievement && (achievement._lengthStr || achievement.length === 0) ? (achievement._lengthStr || (achievement.length ? `${Math.floor(achievement.length / 60)}:${(achievement.length % 60).toString().padStart(2, '0')}` : 'N/A')) : 'N/A'}
              </div>
            )}
            <div className="achievement-date">
              {achievement.date ? formatDate(achievement.date, dateFormat) : 'N/A'}
            </div>
            {showRank && (
              <div className="rank"><strong>#{displayRank != null ? displayRank : achievement.rank}</strong></div>
            )}

          </div>
          <div className="tag-container">
            {(achievement._sortedTags || []).map(tag => (
              <Tag tag={tag} key={tag} />
            ))}
            {shouldShowTier(tier, mode, usePlatformers, showTiers) && (
              <TierTag tier={tier} totalAchievements={totalAchievements} achievements={achievements} extraLists={extraLists} />
            )}
          </div>
          <div className="achievement-details">
            <div className="text">
              <h2>{achievement.name}</h2>
              <p>{achievement.player}</p>
            </div>
            <div className="thumbnail-container">
              <img src={(achievement && achievement._thumbnail) || getThumbnailUrl(achievement, false)} alt={achievement.name} loading="lazy" />
              {autoThumbAvailable && (
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>Automatic thumbnail applied</div>
              )}
            </div>
          </div>

        </div>
      </a>
    </Link>
  );
}, (prev, next) => {
  const pa = prev.achievement || {};
  const na = next.achievement || {};
  const sameId = (pa.id && na.id) ? String(pa.id) === String(na.id) : pa === na;
  return sameId
    && prev.devMode === next.devMode
    && prev.autoThumbAvailable === next.autoThumbAvailable
    && prev.displayRank === next.displayRank
    && prev.showRank === next.showRank
    && prev.totalAchievements === next.totalAchievements
    && prev.mode === next.mode
    && prev.usePlatformers === next.usePlatformers
    && prev.showTiers === next.showTiers
    && prev.listType === next.listType
    && prev.onEditHandler === next.onEditHandler
    && prev.onEditIdx === next.onEditIdx;
});


function useDebouncedValue(value, opt) {
  const [debounced, setDebounced] = useState(value);
  const lastChangeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const idleRef = useRef(null);

  const resolveOptions = (o) => {
    if (typeof o === 'number') return { minDelay: o, maxDelay: o, useIdle: false };
    return Object.assign({ minDelay: 120, maxDelay: 400, useIdle: false }, o || {});
  };

  const { minDelay, maxDelay, useIdle } = resolveOptions(opt);

  useEffect(() => {
    const now = Date.now();
    const sinceLast = Math.max(0, now - (lastChangeRef.current || 0));
    lastChangeRef.current = now;

    const delay = sinceLast < 250 ? minDelay : maxDelay;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (idleRef.current && typeof cancelIdleCallback === 'function') {
      try { cancelIdleCallback(idleRef.current); } catch (e) { }
    }

    let finished = false;

    timerRef.current = setTimeout(() => {
      finished = true;
      setDebounced(value);
    }, delay);

    if (useIdle && typeof requestIdleCallback === 'function') {
      try {
        idleRef.current = requestIdleCallback(() => {
          if (finished) return;
          finished = true;
          if (timerRef.current) clearTimeout(timerRef.current);
          setDebounced(value);
        }, { timeout: maxDelay });
      } catch (e) {
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (idleRef.current && typeof cancelIdleCallback === 'function') {
        try { cancelIdleCallback(idleRef.current); } catch (e) { }
      }
    };
  }, [value, minDelay, maxDelay, useIdle]);

  return debounced;
}

export default React.memo(function SharedList({
  dataUrl = '/achievements.json',
  dataFileName = 'achievements.json',
  storageKeySuffix = 'achievements',
  mode = '',
  showPlatformToggle = true,
  rankOffset = 0,
  showTiers = false,
}) {
  if (storageKeySuffix === 'legacy' || storageKeySuffix === 'pending') {
    showTiers = false;
  }
  let file = '';
  if (typeof window !== 'undefined') {
    file = window.location.pathname;
  } else if (typeof global !== 'undefined' && global.process && global.process.cwd) {
    file = global.process.cwd();
  }
  try {
    const _fileLower = String(file || '').toLowerCase();
    const _dataFileLower = String(dataFileName || '').toLowerCase();
    const _suppress = ['legacy.json', 'pending.json', 'legacy.js', 'pending.js'];
    const shouldLog = !_suppress.some(n => n === _dataFileLower || _fileLower.includes(n));
    if (shouldLog) {
      console.warn('[SHAREDLIST_DEBUG]', { showTiers, file, env: typeof window !== 'undefined' ? 'client' : 'server' });
      console.trace('[SHAREDLIST_DEBUG_TRACE]');
    }
  } catch (e) {
  }
  const [achievements, setAchievements] = useState([]);
  const achievementsRef = useRef(achievements);
  useEffect(() => { achievementsRef.current = achievements; }, [achievements]);

  const [usePlatformers, setUsePlatformers] = useState(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem('usePlatformers') : null;
      return v === '1' || v === 'true';
    } catch (e) {
      return false;
    }
  });
  const searchJumpPendingRef = useRef(false);
  const lastJumpQueryRef = useRef(null);
  const jumpCycleIndexRef = useRef(0);
  const listRef = useRef(null);
  function restorePrevScroll(prevScrollTop, prevScrollLeft, prevActive) {
    try {
      const listCur = listRef && listRef.current;
      if (listCur) {
        if (typeof listCur.scrollTo === 'function') {
          try { listCur.scrollTo(prevScrollTop); } catch (e) { }
        }
        const outer = listCur._outerRef || listCur.outerRef || listCur._listRef || listCur._scrollingContainer || null;
        if (outer && outer.scrollTop !== undefined) {
          outer.scrollTop = prevScrollTop; outer.scrollLeft = prevScrollLeft; return;
        }
      }
    } catch (e) { }
    try {
      const scrollEl = (typeof document !== 'undefined') ? (document.scrollingElement || document.documentElement || document.body) : null;
      if (scrollEl) { scrollEl.scrollTop = prevScrollTop; scrollEl.scrollLeft = prevScrollLeft; }
    } catch (e) { }
    try { if (prevActive && typeof prevActive.focus === 'function' && document.activeElement !== prevActive) prevActive.focus(); } catch (e) { }
  }

  function adjustScrollToKeepElementById(id, prevTop, prevActive) {
    try {
      if (!id) return false;
      const listCur = listRef && listRef.current;
      const outer = listCur && (listCur._outerRef || listCur.outerRef || listCur._listRef || listCur._scrollingContainer) || null;
      let foundEl = null;
      try {
        const refs = achievementRefs && achievementRefs.current ? achievementRefs.current : [];
        for (let i = 0; i < refs.length; i++) {
          const el = refs[i];
          if (!el) continue;
          try {
            if (el.dataset && String(el.dataset.achievementId) === String(id)) { foundEl = el; break; }
            if (el.getAttribute && el.getAttribute('data-achievement-id') === String(id)) { foundEl = el; break; }
          } catch (e) { }
        }
      } catch (e) { }
      if (!foundEl && outer) {
        try { foundEl = outer.querySelector && outer.querySelector(`[data-achievement-id="${String(id).replace(/"/g, '\\"')}"]`); } catch (e) { }
      }
      if (!foundEl) return false;
      const newTop = foundEl.getBoundingClientRect().top;
      const delta = newTop - prevTop;
      if (delta === 0) return true;
      try {
        if (outer && typeof outer.scrollTop === 'number') {
          outer.scrollTop = (outer.scrollTop || 0) + delta;
        } else {
          window.scrollBy(0, delta);
        }
      } catch (e) {
        try { window.scrollBy(0, delta); } catch (ee) { }
      }
      try { if (prevActive && typeof prevActive.focus === 'function' && document.activeElement !== prevActive) prevActive.focus(); } catch (e) { }
      return true;
    } catch (e) { return false; }
  }
  const derivedCacheRef = sharedListManager.derivedCacheRef;
  const [search, setSearch] = useState('');
  const [noMatchMessage, setNoMatchMessage] = useState('');
  const debouncedSearch = useDebouncedValue(search, { minDelay: 120, maxDelay: 400, useIdle: true });
  const tagFilterApi = useTagFilters({ include: [], exclude: [] });
  const { include: _includeTags, exclude: _excludeTags, setInclude: _setIncludeTags, setExclude: _setExcludeTags, matchesItem: _matchesTagItem, getActiveFilters } = tagFilterApi;

  const filterTags = useMemo(() => ({ include: _includeTags, exclude: _excludeTags }), [_includeTags, _excludeTags]);
  const setFilterTags = useCallback((next) => {
    try {
      _setIncludeTags(next && Array.isArray(next.include) ? next.include : []);
      _setExcludeTags(next && Array.isArray(next.exclude) ? next.exclude : []);
    } catch (e) { }
  }, [_setIncludeTags, _setExcludeTags]);

  const handleSetFilterTags = useCallback((next) => {
    try { setFilterTags(next); } catch (e) { }
  }, [setFilterTags]);

  const filterTagsRef = useRef(filterTags);
  useEffect(() => { filterTagsRef.current = filterTags; }, [filterTags]);

  const [debouncedFilterTags, setDebouncedFilterTags] = useState(() => filterTags);
  const debouncedFilterTagsRef = useRef(debouncedFilterTags);
  useEffect(() => { debouncedFilterTagsRef.current = debouncedFilterTags; }, [debouncedFilterTags]);
  useEffect(() => {
    const t = setTimeout(() => {
      try { setDebouncedFilterTags(getActiveFilters()); } catch (e) { }
    }, 140);
    return () => clearTimeout(t);
  }, [_includeTags, _excludeTags, getActiveFilters]);

  const [allTags, setAllTags] = useState([]);
  const AVAILABLE_TAGS = useMemo(() => {
    try {
      const uniq = Array.from(new Set(Array.isArray(allTags) ? allTags : []));
      return uniq.sort((a, b) => {
        const ia = TAG_PRIORITY_ORDER.indexOf(String(a || '').toUpperCase());
        const ib = TAG_PRIORITY_ORDER.indexOf(String(b || '').toUpperCase());
        if (ia === ib) return String(a || '').localeCompare(String(b || ''));
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    } catch (e) { return Array.isArray(allTags) ? allTags.slice() : []; }
  }, [allTags]);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const mobileBtnRef = useRef();
  const [isPending, startTransition] = typeof useTransition === 'function' ? useTransition() : [false, fn => fn()];
  const [devMode, setDevMode] = useState(false);
  const devModeRef = useRef(devMode);
  useEffect(() => { devModeRef.current = devMode; }, [devMode]);

  const hideRank = storageKeySuffix === 'pending' || dataFileName === 'pending.json';

  const [originalAchievements, setOriginalAchievements] = useState(null);
  const originalSnapshotRef = useRef(null);
  const {
    sortList,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    randomSeed,
    setRandomSeed,
    compareByKey,
    getListSignature,
  } = useSortedList({ storageKeySuffix, derivedCacheRef });

  const [reordered, setReordered] = useState(null);
  const reorderedRef = sharedListManager.reorderedRef;
  useEffect(() => { try { sharedListManager.reorderedRef.current = reordered; } catch (e) { } }, [reordered]);
  const [stagedReordered, setStagedReordered] = useState(null);
  const stagedRef = sharedListManager.stagedRef;
  useEffect(() => { try { sharedListManager.stagedRef.current = stagedReordered; } catch (e) { } }, [stagedReordered]);
  const stagedApplyTimerRef = useRef(null);
  useEffect(() => {
    try {
      if (stagedApplyTimerRef.current) clearTimeout(stagedApplyTimerRef.current);
      if (!Array.isArray(stagedReordered) || stagedReordered.length === 0) return;
      stagedApplyTimerRef.current = setTimeout(() => {
        try {
          setReordered(prev => {
            try { return mapEnhanceArray(stagedReordered, achievementsRef.current || prev || []); } catch (e) { return stagedReordered; }
          });
        } catch (e) { }
      }, 180);
    } catch (e) { }
    return () => { try { if (stagedApplyTimerRef.current) { clearTimeout(stagedApplyTimerRef.current); stagedApplyTimerRef.current = null; } } catch (e) { } };
  }, [stagedReordered]);
  const ongoingFilterControllerRef = useRef(null);
  const manualSearchControllerRef = useRef(null);
  const workerRef = useRef(null);
  const pendingWorkerRequestsRef = useRef(new Map());
  const workerSeqRef = useRef(0);

  function postWorkerMessage(type, payload) {
    return new Promise((resolve, reject) => {
      try {
        const id = (workerSeqRef.current = (workerSeqRef.current || 0) + 1);
        pendingWorkerRequestsRef.current.set(id, { resolve, reject });
        const w = workerRef.current;
        if (!w) return reject(new Error('no-worker'));
        w.postMessage({ id, type, payload });
      } catch (e) { reject(e); }
    });
  }

  useEffect(() => {
    try {
      const workerCode = `self.onmessage = function(e){try{var d=e.data||{};var id=d.id;var type=d.type;var p=d.payload||{};if(type==='fuseSearch'){try{importScripts('https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.min.js');}catch(err){}try{var items=p.items||[];var options=p.options||{};var q=p.query||'';var fuse=new Fuse(items, options);var res=fuse.search(q);var out=res.map(function(r){return (r&&r.item)?r.item:r;});self.postMessage({id:id,type:type,result:out});}catch(err){self.postMessage({id:id,type:type,result:p.items||[]});}}else if(type==='buildPasteIndex'){try{var items=p.items||[];var maxPrefix=p.maxPrefix||20;var idx=new Array(items.length);var prefixMapObj={};for(var i=0;i<items.length;i++){var a=items[i];var searchable=[a&&a.name,a&&a.player,a&&a.id,a&&a.levelID,a&&a.submitter,(a&&a.tags)?(a.tags.join(' ')):''].filter(Boolean).join(' ').toLowerCase();idx[i]={achievement:a,searchable:searchable};var toks=(searchable||'').split(/\s+/).filter(Boolean);toks.forEach(function(tok){var capped=String(tok).slice(0,maxPrefix);for(var pLen=1;pLen<=capped.length;pLen++){var key=capped.slice(0,pLen);if(!prefixMapObj[key]) prefixMapObj[key]=[];prefixMapObj[key].push(i);}});}self.postMessage({id:id,type:type,result:{idx:idx,prefixMap:prefixMapObj}});}catch(err){self.postMessage({id:id,type:type,result:{idx:[],prefixMap:{}}});}}else{self.postMessage({id:id,type:type,result:null});}}catch(e){try{self.postMessage({id:(e&&e.id)||null,type:'error',result:null});}catch(_){} }};`;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const w = new Worker(url);
      w.onmessage = function (ev) {
        try {
          const msg = ev.data || {};
          const id = msg.id;
          const entry = pendingWorkerRequestsRef.current.get(id);
          if (entry) {
            entry.resolve(msg.result);
            pendingWorkerRequestsRef.current.delete(id);
          }
        } catch (e) { }
      };
      workerRef.current = w;
      return () => {
        try { if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; } } catch (e) { }
        try { URL.revokeObjectURL(url); } catch (e) { }
      };
    } catch (e) { }
  }, []);
  useEffect(() => () => { try { if (manualSearchControllerRef.current && typeof manualSearchControllerRef.current.abort === 'function') manualSearchControllerRef.current.abort(); } catch (e) { } }, []);

  const prevSortKeyRef = useRef(null);

  useEffect(() => {
    if (sortKey === 'random' && prevSortKeyRef.current !== 'random') {
      setRandomSeed(Math.floor(Math.random() * 0x7fffffff));
    }
    prevSortKeyRef.current = sortKey;
  }, [sortKey]);
  const [bgImage, setBgImage] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const hoveredIdxRef = useRef(null);
  const neighborContextRef = useRef(new Map());
  const [duplicateThumbKeys, setDuplicateThumbKeys] = useState(new Set());
  const [autoThumbMap, setAutoThumbMap] = useState(() => {
    try {
      if (typeof window === 'undefined') return {};
      const key = `thal_autoThumbMap_${storageKeySuffix}`;
      const raw = window.localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  });
  const [newForm, setNewForm] = useState({
    name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: []
  });
  const [newFormTags, setNewFormTags] = useState([]);
  const [newFormCustomTags, setNewFormCustomTags] = useState('');
  const [pasteSearch, setPasteSearch] = useState('');
  const [pasteShowResults, setPasteShowResults] = useState(false);
  const [pasteIndex, setPasteIndex] = useState([]);
  const pasteIndexRef = sharedListManager.pasteIndexRef;
  const pastePrefixMapRef = sharedListManager.pastePrefixMapRef;
  const debouncedPasteSearch = useDebouncedValue(pasteSearch, { minDelay: 80, maxDelay: 250, useIdle: true });
  const pendingSearchJumpRef = useRef(null);
  const [extraLists, setExtraLists] = useState({});
  const EXTRA_FILES = ['pending.json', 'legacy.json', 'platformers.json', 'platformertimeline.json', 'timeline.json', 'removed.json'];
  const [insertIdx, setInsertIdx] = useState(null);
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editFormTags, setEditFormTags] = useState([]);
  const [editFormCustomTags, setEditFormCustomTags] = useState('');

  useEffect(() => { try { sharedListManager.editIdxRef.current = editIdx; } catch (e) { } }, [editIdx]);
  useEffect(() => { try { sharedListManager.editFormRef.current = editForm; sharedListManager.editFormTagsRef.current = editFormTags; sharedListManager.editFormCustomTagsRef.current = editFormCustomTags; } catch (e) { } }, [editForm, editFormTags, editFormCustomTags]);
  const achievementRefs = useRef([]);
  const searchTokensWeakRef = useRef(new WeakMap());
  const handleMoveUpRef = useRef(null);
  const handleMoveDownRef = useRef(null);
  const handleEditRef = useRef(null);
  const handleRemoveRef = useRef(null);
  const handleDuplicateRef = useRef(null);
  const handleCopyRef = useRef(null);
  const realIdxMapRef = useRef(new Map());

  function batchUpdateReordered(mutator, opts = {}) {
    if (typeof mutator !== 'function') return;
    const scrollEl = (typeof document !== 'undefined') ? (document.scrollingElement || document.documentElement || document.body) : null;
    const listOuter = (listRef && listRef.current && listRef.current._outerRef) ? listRef.current._outerRef : null;
    const prevScrollTop = (opts && typeof opts.prevScrollTop === 'number') ? opts.prevScrollTop : (listOuter ? listOuter.scrollTop : (scrollEl ? scrollEl.scrollTop : 0));
    const prevScrollLeft = (opts && typeof opts.prevScrollLeft === 'number') ? opts.prevScrollLeft : (listOuter ? listOuter.scrollLeft : (scrollEl ? scrollEl.scrollLeft : 0));
    const prevActive = (opts && opts.prevActive !== undefined) ? opts.prevActive : ((typeof document !== 'undefined') ? document.activeElement : null);
    let movedId = (opts && opts.movedId !== undefined) ? opts.movedId : null;
    let prevElemTop = (opts && opts.prevElemTop !== undefined) ? opts.prevElemTop : null;
    try {
      if (movedId == null || prevElemTop == null) {
        const idxForContext = (opts && typeof opts.contextIdx === 'number') ? opts.contextIdx : 0;
        const list = visibleListRef.current || [];
        const displayed = (list && list.length) ? list[idxForContext] : null;
        if ((movedId == null) && displayed && displayed.id) movedId = String(displayed.id);
        const node = achievementRefs && achievementRefs.current ? achievementRefs.current[idxForContext] : null;
        if ((prevElemTop == null) && node && typeof node.getBoundingClientRect === 'function') prevElemTop = node.getBoundingClientRect().top;
      }
    } catch (e) { }

    startTransition(() => {
      const applyMutatorToArrayMinimal = (arr) => {
        const copy = Array.isArray(arr) ? arr.slice() : [];
        let result;
        try { result = mutator(copy) || copy; } catch (e) { return arr; }
        if (!Array.isArray(result)) return arr;

        let needChange = false;
        if (result.length !== (arr ? arr.length : 0)) needChange = true;

        const out = new Array(result.length);
        for (let i = 0; i < result.length; i++) {
          const a = result[i];
          out[i] = a;
          if (!needChange && arr && arr[i] !== a) needChange = true;
        }

        if (!needChange) return arr;
        return out;
      };

      if (stagedRef.current && Array.isArray(stagedRef.current)) {
        setStagedReordered(prev => {
          try { return mapEnhanceArray(applyMutatorToArrayMinimal(prev), achievementsRef.current || prev || []); } catch (e) { return applyMutatorToArrayMinimal(prev); }
        });
      } else {
        setReordered(prev => {
          try { return mapEnhanceArray(applyMutatorToArrayMinimal(prev), achievementsRef.current || prev || []); } catch (e) { return applyMutatorToArrayMinimal(prev); }
        });
      }
      try {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          try {
            let ok = false;
            try { if (movedId && prevElemTop != null) ok = adjustScrollToKeepElementById(movedId, prevElemTop, prevActive); } catch (e) { ok = false; }
            if (!ok) restorePrevScroll(prevScrollTop, prevScrollLeft, prevActive);
          } catch (e) { }
        }));
      } catch (e) { }
    });
  }

  function resolveRealIdx(displayIdx) {
    try {
      const currentReordered = (stagedReordered && Array.isArray(stagedReordered) && stagedReordered.length) ? stagedReordered : reordered;
      if (!currentReordered || !Array.isArray(currentReordered) || currentReordered.length === 0) {
        return (typeof displayIdx === 'number') ? displayIdx : -1;
      }
      if (typeof displayIdx === 'string') {
        const key = String(displayIdx);
        if (realIdxMapRef && realIdxMapRef.current && realIdxMapRef.current.has(key)) return realIdxMapRef.current.get(key);
        const real = currentReordered.findIndex(x => x && x.id ? String(x.id) === key : false);
        return real === -1 ? -1 : real;
      }

      const disp = Number(displayIdx);
      if (Number.isNaN(disp)) return -1;
      const displayed = (visibleListRef && visibleListRef.current && Array.isArray(visibleListRef.current)) ? visibleListRef.current[disp] : null;
      if (!displayed) return disp;

      if (displayed.id) {
        const key = String(displayed.id);
        if (realIdxMapRef && realIdxMapRef.current && realIdxMapRef.current.has(key)) return realIdxMapRef.current.get(key);
        const real = currentReordered.findIndex(x => x && x.id ? String(x.id) === key : false);
        return real === -1 ? disp : real;
      }

      const realByObj = currentReordered.findIndex(x => x === displayed);
      return realByObj === -1 ? disp : realByObj;
    } catch (e) {
      return displayIdx;
    }
  }

  function handleMoveAchievementUp(idx) {
    const realIdx = resolveRealIdx(idx);
    if (realIdx <= 0) return;
    const scrollEl = (typeof document !== 'undefined') ? (document.scrollingElement || document.documentElement || document.body) : null;
    const listOuter = (listRef && listRef.current && listRef.current._outerRef) ? listRef.current._outerRef : null;
    const prevScrollTop = listOuter ? listOuter.scrollTop : (scrollEl ? scrollEl.scrollTop : 0);
    const prevScrollLeft = listOuter ? listOuter.scrollLeft : (scrollEl ? scrollEl.scrollLeft : 0);
    const prevActive = (typeof document !== 'undefined') ? document.activeElement : null;
    let movedId = null;
    let prevElemTop = null;
    try {
      const list = visibleListRef.current || [];
      const displayed = (list && list.length) ? list[idx] : null;
      if (displayed && displayed.id) movedId = String(displayed.id);
      const node = achievementRefs && achievementRefs.current ? achievementRefs.current[idx] : null;
      if (node && typeof node.getBoundingClientRect === 'function') prevElemTop = node.getBoundingClientRect().top;
    } catch (e) { }

    try {
      const isStaged = stagedRef.current && Array.isArray(stagedRef.current) && stagedRef.current.length;
      const src = isStaged ? stagedRef.current : (reordered && Array.isArray(reordered) ? reordered : null);
      if (src && Array.isArray(src) && realIdx > 0 && realIdx < src.length) {
        const targetIdx = realIdx - 1;
        const swapped = src.slice();
        const tmp = swapped[targetIdx];
        swapped[targetIdx] = swapped[realIdx];
        swapped[realIdx] = tmp;

        if (isStaged) {
          try {
            stagedRef.current = swapped;
            setStagedReordered(swapped);
          } catch (e) { stagedRef.current = src; throw e; }
        } else {
          try {
            reorderedRef.current = swapped;
            setReordered(swapped);
          } catch (e) { reorderedRef.current = src; throw e; }
        }

        requestAnimationFrame(() => requestAnimationFrame(() => {
          try {
            let ok = false;
            try { if (movedId && prevElemTop != null) ok = adjustScrollToKeepElementById(movedId, prevElemTop, prevActive); } catch (e) { ok = false; }
            if (!ok) restorePrevScroll(prevScrollTop, prevScrollLeft, prevActive);
          } catch (e) { }
        }));
        return;
      }
    } catch (e) { }

    batchUpdateReordered((arr) => {
      const len = Array.isArray(arr) ? arr.length : 0;
      if (realIdx <= 0 || realIdx >= len) return arr;
      const out = arr.slice();
      const [removed] = out.splice(realIdx, 1);
      out.splice(realIdx - 1, 0, removed);
      return out;
    }, { movedId, prevElemTop, prevScrollTop, prevScrollLeft, prevActive, contextIdx: idx });
  }

  function handleMoveAchievementDown(idx) {
    const realIdx = resolveRealIdx(idx);
    const scrollEl = (typeof document !== 'undefined') ? (document.scrollingElement || document.documentElement || document.body) : null;
    const prevScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const prevScrollLeft = scrollEl ? scrollEl.scrollLeft : 0;
    const prevActive = (typeof document !== 'undefined') ? document.activeElement : null;
    let movedId = null;
    let prevElemTop = null;
    try {
      const list = visibleListRef.current || [];
      const displayed = (list && list.length) ? list[idx] : null;
      if (displayed && displayed.id) movedId = String(displayed.id);
      const node = achievementRefs && achievementRefs.current ? achievementRefs.current[idx] : null;
      if (node && typeof node.getBoundingClientRect === 'function') prevElemTop = node.getBoundingClientRect().top;
    } catch (e) { }

    try {
      const isStaged = stagedRef.current && Array.isArray(stagedRef.current) && stagedRef.current.length;
      const src = isStaged ? stagedRef.current : (reordered && Array.isArray(reordered) ? reordered : null);
      if (src && Array.isArray(src) && realIdx >= 0 && realIdx < src.length - 1) {
        const targetIdx = realIdx + 1;
        const swapped = src.slice();
        const tmp = swapped[targetIdx];
        swapped[targetIdx] = swapped[realIdx];
        swapped[realIdx] = tmp;

        if (isStaged) {
          try {
            stagedRef.current = swapped;
            setStagedReordered(swapped);
          } catch (e) { stagedRef.current = src; throw e; }
        } else {
          try {
            reorderedRef.current = swapped;
            setReordered(swapped);
          } catch (e) { reorderedRef.current = src; throw e; }
        }

        requestAnimationFrame(() => requestAnimationFrame(() => {
          try {
            let ok = false;
            try { if (movedId && prevElemTop != null) ok = adjustScrollToKeepElementById(movedId, prevElemTop, prevActive); } catch (e) { ok = false; }
            if (!ok) restorePrevScroll(prevScrollTop, prevScrollLeft, prevActive);
          } catch (e) { }
        }));
        return;
      }
    } catch (e) { }

    batchUpdateReordered((arr) => {
      const len = Array.isArray(arr) ? arr.length : 0;
      if (realIdx < 0 || realIdx >= len - 1) return arr;
      const out = arr.slice();
      const [removed] = out.splice(realIdx, 1);
      out.splice(realIdx + 1, 0, removed);
      return out;
    }, { movedId, prevElemTop, prevScrollTop, prevScrollLeft, prevActive, contextIdx: idx });
  }

  const scrollToIdxRef = useRef(null);

  function setScrollToIdx(idx) {
    try {
      scrollToIdxRef.current = idx;
      if (idx === null) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try {
          const lr = listRef && listRef.current;
          const isDev = !!devModeRef.current;
          if (isDev) {
            const idxClamped = Math.max(0, Math.min(idx, (visibleListRef.current || []).length - 1));
            if (lr && typeof lr.scrollToItem === 'function') {
              try { lr.scrollToItem(idxClamped, 'center'); } catch (e) { }
            } else if (achievementRefs.current && achievementRefs.current[idxClamped]) {
              try { achievementRefs.current[idxClamped].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { }
            }
            try { if (searchJumpPendingRef && searchJumpPendingRef.current) searchJumpPendingRef.current = false; } catch (e) { }
          } else {
            const list = filtered || (achievementsRef.current || []).slice();
            const idxClamped = Math.max(0, Math.min(idx, (list || []).length - 1));
            if (lr && typeof lr.scrollToItem === 'function') {
              try { lr.scrollToItem(idxClamped, 'center'); } catch (e) { }
            } else if (achievementRefs.current && achievementRefs.current[idxClamped]) {
              try { achievementRefs.current[idxClamped].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { }
            }
            try { if (searchJumpPendingRef && searchJumpPendingRef.current) searchJumpPendingRef.current = false; } catch (e) { }
          }
        } catch (e) { }
      }));
    } catch (e) { }
  }
  const [changelogPreview, setChangelogPreview] = useState(null);
  const [showChangelogPreview, setShowChangelogPreview] = useState(false);

  useEffect(() => {
    try { if (neighborContextRef && neighborContextRef.current) neighborContextRef.current.clear(); } catch (e) { }
  }, [achievements, reordered]);

  useEffect(() => {
    try {
      const map = new WeakMap();
      const items = Array.isArray(achievements) ? achievements : [];
      for (let i = 0; i < items.length; i++) {
        const a = items[i];
        try {
          const norm = (a && a._searchableNormalized) ? a._searchableNormalized : normalizeForSearch([a && a.name, a && a.player, a && a.id, a && a.levelID].filter(Boolean).join(' '));
          const toks = _tokensFromNormalized(norm) || [];
          map.set(a, toks);
        } catch (e) {
          try { map.set(a, []); } catch (ee) { }
        }
      }
      searchTokensWeakRef.current = map;
    } catch (e) { }
  }, [achievements]);

  function getItemTokens(a) {
    try {
      const map = searchTokensWeakRef.current;
      if (map && typeof map.get === 'function') {
        const fromMap = map.get(a);
        if (Array.isArray(fromMap)) return fromMap;
      }
      const norm = (a && a._searchableNormalized) ? a._searchableNormalized : normalizeForSearch([a && a.name, a && a.player, a && a.id, a && a.levelID].filter(Boolean).join(' '));
      return _tokensFromNormalized(norm) || [];
    } catch (e) { return []; }
  }
  useEffect(() => {
    try {
      const cur = (stagedReordered && Array.isArray(stagedReordered) && stagedReordered.length) ? stagedReordered : (reordered && Array.isArray(reordered) ? reordered : []);
      const m = new Map();
      for (let i = 0; i < (cur || []).length; i++) {
        try {
          const it = cur[i];
          if (it && it.id) m.set(String(it.id), i);
        } catch (e) { }
      }
      realIdxMapRef.current = m;
    } catch (e) { }
  }, [reordered, stagedReordered]);
  function handleEditAchievement(idxOrId) {
    try {
      const currentReordered = (stagedReordered && Array.isArray(stagedReordered) && stagedReordered.length) ? stagedReordered : reordered;
      if (!currentReordered || !Array.isArray(currentReordered) || currentReordered.length === 0) return;

      let realIdx = null;

      if (typeof idxOrId === 'string' || (idxOrId && typeof idxOrId === 'object' && idxOrId.id)) {
        const id = typeof idxOrId === 'string' ? String(idxOrId) : String(idxOrId.id);
        if (realIdxMapRef && realIdxMapRef.current && realIdxMapRef.current.has(id)) {
          realIdx = realIdxMapRef.current.get(id);
        } else {
          realIdx = currentReordered.findIndex(x => x && x.id ? String(x.id) === id : false);
        }
        if (realIdx === -1) return;
      } else {
        const displayIdx = Number(idxOrId);
        if (Number.isNaN(displayIdx)) return;
        realIdx = resolveRealIdx(displayIdx);
      }

      if (!currentReordered || !currentReordered[realIdx]) return;
      const a = currentReordered[realIdx];
      setEditIdx(realIdx);
      setEditForm({
        ...a,
        version: Number(a.version) || 2,
        levelID: Number(a.levelID) || 0,
        length: Number(a.length) || 0
      });
      setEditFormTags(Array.isArray(a.tags) ? [...a.tags] : []);
      setEditFormCustomTags('');
      setShowNewForm(false);
    } catch (e) {
      return;
    }
  }

  useEffect(() => {
    let file = dataUrl;
    if (usePlatformers) {
      if (dataFileName === 'achievements.json' || dataUrl.endsWith('/achievements.json')) file = '/platformers.json';
      else if (dataFileName === 'timeline.json' || dataUrl.endsWith('/timeline.json')) file = '/platformertimeline.json';
    }
    fetch(file)
      .then(res => res.json())
      .then(data => {
        let list;
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.tags) && Array.isArray(data.items)) {
          const masterTags = data.tags;
          list = data.items.map(it => {
            if (Array.isArray(it)) {
              return { tags: it.map(i => masterTags[i]).filter(Boolean) };
            }
            if (it && typeof it === 'object') {
              const copy = { ...it };
              if (Array.isArray(copy.tags) && copy.tags.length && typeof copy.tags[0] === 'number') {
                copy.tags = copy.tags.map(i => masterTags[i]).filter(Boolean);
              }
              return copy;
            }
            return it;
          });
        } else {
          list = (data.achievements || []);
        }

        const valid = list.filter(a => a && typeof a.name === 'string' && a.name && a.id);
        let finalOriginal = null;
        let finalEnhanced = [];
        finalOriginal = valid.map(a => ({ ...a }));
        finalEnhanced = mapEnhanceArray(finalOriginal, achievementsRef.current || []);

        setAchievements(() => finalEnhanced);
        const snap = Array.isArray(finalOriginal) ? finalOriginal.slice() : [];
        setOriginalAchievements(snap);
        try { originalSnapshotRef.current = snap; } catch (e) { }

        const tagSet = new Set();
        if (data && Array.isArray(data.tags)) data.tags.forEach(t => tagSet.add(t));
        valid.forEach(a => (a.tags || []).forEach(t => tagSet.add(t)));
        setAllTags(Array.from(tagSet));
      })
      .catch(() => { });
  }, [dataUrl, dataFileName, usePlatformers]);


  const handleKeyDown = useCallback((e) => {
    if (e.shiftKey && (e.key === 'M' || e.key === 'm')) {
      setDevMode(v => {
        const next = !v;
        if (!next) {
          if (stagedRef.current && Array.isArray(stagedRef.current)) {
            try { setReordered(mapEnhanceArray(Array.isArray(stagedRef.current) ? stagedRef.current.slice() : [], achievementsRef.current || stagedRef.current || [])); } catch (e) { setReordered(Array.isArray(stagedRef.current) ? stagedRef.current.slice() : []); }
            setStagedReordered(null);
          } else {
            setReordered(null);
            reorderedRef.current = null;
          }
        } else {
          try { setReordered(mapEnhanceArray(achievementsRef.current || [], achievementsRef.current || [])); } catch (e) { setReordered(achievementsRef.current); }
          reorderedRef.current = achievementsRef.current;
        }
        return next;
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!isMobile) return;
    let pinchActive = false;
    let lastTouches = [];
    let pinchStartDist = null;
    let pinchEndDist = null;

    function getDistance(touches) {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function handleTouchStart(e) {
      if (e.touches.length === 2) {
        pinchActive = true;
        pinchStartDist = getDistance(e.touches);
      }
      lastTouches = Array.from(e.touches);
    }

    function handleTouchMove(e) {
      if (pinchActive && e.touches.length === 2) {
        pinchEndDist = getDistance(e.touches);
      }
      lastTouches = Array.from(e.touches);
    }

    function handleTouchEnd(e) {
      if (pinchActive && pinchStartDist && pinchEndDist && pinchEndDist < pinchStartDist - 40) {
        pinchActive = false;
        pinchStartDist = null;
        pinchEndDist = null;
        return;
      }
      lastTouches = Array.from(e.touches);
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, achievements]);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 900);
      if (window.innerWidth > 900) setShowMobileFilters(false);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const searchLower = useMemo(() => {
    const s = debouncedSearch;
    return (s || '').trim().toLowerCase();
  }, [debouncedSearch]);

  const searchNormalized = useMemo(() => {
    try { return normalizeForSearch(debouncedSearch || ''); } catch (e) { return ''; }
  }, [debouncedSearch]);

  const queryTokens = useMemo(() => (searchNormalized || '') ? searchNormalized.split(' ').filter(Boolean) : [], [searchNormalized]);

  const handleOnEditCommand = useCallback(() => {
    try {
      if (!devModeRef.current) {
        devModeRef.current = true;
        setDevMode(true);
      }
      if (!reorderedRef.current) {
        const copy = Array.isArray(achievementsRef.current) ? achievementsRef.current.slice() : [];
        reorderedRef.current = copy;
        setReordered(copy);
      }
      try { setSearch(''); } catch (e) { }
      try { if (document && document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); } catch (e) { }
    } catch (e) { }
  }, []);

  const {
    results: _searchResults,
    isSearching: _isSearching,
    noMatches: _noMatches,
    searchInputRef,
    handleSearchKeyDown,
    handleVisibleInputChange,
    debouncedManualSearch,
  } = useSearch(
    useMemo(() => {
      try {
        if (!Array.isArray(achievements)) return [];
        return achievements.map(a => {
          if (!a || typeof a !== 'object') return a;
          if (a._searchableNormalized) return a;
          const name = a && (a.name || a.title) ? String(a.name || a.title) : '';
          const player = a && a.player ? String(a.player) : '';
          const description = a && a.description ? String(a.description) : '';
          const idStr = a && a.id != null ? String(a.id) : '';
          const searchable = `${name} ${player} ${description} ${idStr}`;
          try {
            return { ...a, _searchableNormalized: normalizeForSearch(searchable) };
          } catch (e) {
            return { ...a, _searchableNormalized: '' };
          }
        });
      } catch (e) { return achievements; }
    }, [getListSignature(achievements)]),
    debouncedSearch,
    { include: (debouncedFilterTags && debouncedFilterTags.include) || [], exclude: (debouncedFilterTags && debouncedFilterTags.exclude) || [] },
    { debounceMs: 120, setSearchCallback: setSearch, onEditCommand: handleOnEditCommand, externalRefs: { searchJumpPendingRef, lastJumpQueryRef, jumpCycleIndexRef, pendingSearchJumpRef } }
  );

  const _normalizedFilterTags = useMemo(() => {
    const src = debouncedFilterTags || { include: [], exclude: [] };
    const inc = Array.isArray(src.include) ? src.include.slice().map(s => String(s || '').toUpperCase()) : [];
    const exc = Array.isArray(src.exclude) ? src.exclude.slice().map(s => String(s || '').toUpperCase()) : [];
    return { include: inc, exclude: exc };
  }, [debouncedFilterTags]);

  const filterFn = useCallback(
    a => {
      const tags = (a.tags || []).map(t => String(t || '').toUpperCase());
      const include = _normalizedFilterTags.include;
      const exclude = _normalizedFilterTags.exclude;
      if (include.length && !include.every(tag => tags.includes(tag))) return false;
      if (exclude.length && exclude.some(tag => tags.includes(tag))) return false;
      if (queryTokens && queryTokens.length) {
        const itemTokens = getItemTokens(a);
        if (!itemTokens || itemTokens.length === 0) return false;
        if (!queryTokens.every(qt => itemTokens.some(t => typeof t === 'string' && t.startsWith(qt)))) return false;
      }
      return true;
    },
    [_normalizedFilterTags, queryTokens]
  );

  const [filtered, setFiltered] = useState([]);
  const prevFilterSigRef = useRef(null);
  useEffect(() => {
    try { if (ongoingFilterControllerRef.current && typeof ongoingFilterControllerRef.current.abort === 'function') ongoingFilterControllerRef.current.abort(); } catch (e) { }
    const controller = { aborted: false, abort() { this.aborted = true; } };
    ongoingFilterControllerRef.current = controller;

    try {
      if (debouncedSearch && String(debouncedSearch).trim()) {
        try { setFiltered(_searchResults || []); } catch (e) { }
        return () => { try { controller.abort(); } catch (e) { } };
      }

    } catch (e) { }

    try {
      const itemsSigList = Array.isArray(achievements) ? achievements : [];
      const filterTagSig = `${(_normalizedFilterTags && _normalizedFilterTags.include) ? _normalizedFilterTags.include.join(',') : ''}|${(_normalizedFilterTags && _normalizedFilterTags.exclude) ? _normalizedFilterTags.exclude.join(',') : ''}`;
      const qSig = (queryTokens && queryTokens.length) ? queryTokens.join(',') : '';
      const filterSig = `${getListSignature(itemsSigList)}|${filterTagSig}|${qSig}|${String(sortKey || '')}|${String(sortDir || '')}|${String(randomSeed || '')}`;

      if (prevFilterSigRef.current && prevFilterSigRef.current === filterSig) {
        return () => { try { controller.abort(); } catch (e) { } };
      }

      prevFilterSigRef.current = filterSig;

      const cache = derivedCacheRef.current && derivedCacheRef.current.filtered;
      if (cache && cache.has(filterSig)) {
        try { setFiltered(cache.get(filterSig)); } catch (e) { }
        return () => { try { controller.abort(); } catch (e) { } };
      }
    } catch (e) { }

    startTransition(() => {
      setTimeout(() => {
        if (controller.aborted) return;
        const items = Array.isArray(achievements) ? achievements : [];

        const batchSize = Math.max(100, Math.floor((items.length || 0) / 50));
        const include = _normalizedFilterTags.include || [];
        const exclude = _normalizedFilterTags.exclude || [];
        const tagFiltered = [];

        let readIndex = 0;
        function processTagBatch() {
          if (controller.aborted) return onProcessingComplete(null);
          const end = Math.min(items.length, readIndex + batchSize);
          for (let i = readIndex; i < end; i++) {
            try {
              const a = items[i];
              const tags = (a && a.tags) ? (a.tags || []).map(t => String(t || '').toUpperCase()) : [];
              if (include.length && !include.every(tag => tags.includes(tag))) continue;
              if (exclude.length && exclude.some(tag => tags.includes(tag))) continue;
              tagFiltered.push(a);
            } catch (e) { }
          }
          readIndex = end;
          if (readIndex < items.length) {
            setTimeout(processTagBatch, 0);
          } else {
            if (!queryTokens || !queryTokens.length) return onProcessingComplete(tagFiltered);
            return onProcessingComplete(tagFiltered);
          }
        }

        function onProcessingComplete(finalResult) {
          if (controller.aborted) return;
          const result = finalResult || [];
          try {
            if (controller.aborted) return;
            if (sortKey === 'levelID') {
              const onlyWithLevel = result.filter(a => {
                const num = Number(a && a.levelID);
                return !isNaN(num) && num > 0;
              });
              const copy = [...onlyWithLevel];
              copy.sort((x, y) => compareByKey(x, y, 'levelID'));
              if (sortDir === 'desc') copy.reverse();
              try { try { const cache = derivedCacheRef.current && derivedCacheRef.current.filtered; if (cache) cache.set(filterSig, copy); } catch (ee) { } setFiltered(copy); } catch (e) { }
              return;
            }
            if (sortKey === 'random') {
              const copy = [...result];
              const keys = copy.map((a, i) => (a && a.id) ? String(a.id) : `__idx_${i}`);
              const seed = randomSeed != null ? randomSeed : 1;
              const rng = mulberry32(seed);
              for (let i = keys.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                const t = keys[i];
                keys[i] = keys[j];
                keys[j] = t;
              }
              const map = {};
              keys.forEach((k, i) => { map[k] = i; });
              const getKey = item => (item && item.id) ? String(item.id) : `__idx_${result.indexOf(item)}`;
              copy.sort((x, y) => ((map[getKey(x)] || 0) - (map[getKey(y)] || 0)));
              try { try { const cache = derivedCacheRef.current && derivedCacheRef.current.filtered; if (cache) cache.set(filterSig, copy); } catch (ee) { } setFiltered(copy); } catch (e) { }
              return;
            }
            if (sortKey) {
              const copy = [...result];
              copy.sort((x, y) => compareByKey(x, y, sortKey));
              if (sortDir === 'desc') copy.reverse();
              try { try { const cache = derivedCacheRef.current && derivedCacheRef.current.filtered; if (cache) cache.set(filterSig, copy); } catch (ee) { } setFiltered(copy); } catch (e) { }
              return;
            }
            try { try { const cache = derivedCacheRef.current && derivedCacheRef.current.filtered; if (cache) cache.set(filterSig, result); } catch (ee) { } setFiltered(result); } catch (e) { }
          } catch (e) { }
        }

        processTagBatch();
        return;
      }, 0);
    });

    return () => { try { controller.abort(); } catch (e) { } };
  }, [achievements, filterFn, sortKey, sortDir, compareByKey, randomSeed, startTransition, debouncedSearch, _searchResults]);

  useEffect(() => {
    if (!pendingSearchJumpRef.current) return;
    if (debouncedManualSearch !== pendingSearchJumpRef.current) return;

    try { if (manualSearchControllerRef && manualSearchControllerRef.current && typeof manualSearchControllerRef.current.abort === 'function') manualSearchControllerRef.current.abort(); } catch (e) { }
    const manualController = { aborted: false, abort() { this.aborted = true; } };
    manualSearchControllerRef.current = manualController;

    const rawQuery = pendingSearchJumpRef.current;
    const normalizedQuery = normalizeForSearch(rawQuery || '');
    const qTokensManual = (normalizedQuery || '') ? normalizedQuery.split(' ').filter(Boolean) : [];

    const matchesQuery = a => {
      if (!a) return false;
      if (manualController.aborted) return false;
      if (!qTokensManual.length) return false;
      const itemTokens = getItemTokens(a);
      if (!itemTokens || itemTokens.length === 0) return false;
      return qTokensManual.every(qt => itemTokens.some(t => typeof t === 'string' && t.startsWith(qt)));
    };

    const respectsTagFilters = a => {
      if (manualController.aborted) return false;
      const tags = (a.tags || []).map(t => t.toUpperCase());
      const ft = debouncedFilterTagsRef.current || { include: [], exclude: [] };
      if (ft.include.length && !ft.include.every(tag => tags.includes(tag.toUpperCase()))) return false;
      if (ft.exclude.length && ft.exclude.some(tag => tags.includes(tag.toUpperCase()))) return false;
      return true;
    };

    const baseList = (devModeRef.current && (stagedRef.current || reorderedRef.current)) ? (stagedRef.current || reorderedRef.current) : achievementsRef.current || [];
    const preFiltered = [];
    for (let i = 0; i < baseList.length; i++) {
      if (manualController.aborted) break;
      const a = baseList[i];
      try { if (respectsTagFilters(a)) preFiltered.push(a); } catch (e) { }
    }
    if (manualController.aborted) {
      try { pendingSearchJumpRef.current = null; } catch (e) { }
      try { searchJumpPendingRef.current = false; } catch (e) { }
      return;
    }
    const matchingItems = [];
    for (let i = 0; i < preFiltered.length; i++) {
      if (manualController.aborted) break;
      const a = preFiltered[i];
      try { if (matchesQuery(a)) matchingItems.push(a); } catch (e) { }
    }
    if (!matchingItems || matchingItems.length === 0) {
      try { pendingSearchJumpRef.current = null; } catch (e) { }
      try { searchJumpPendingRef.current = false; } catch (e) { }
      return;
    }

    const cycleIdx = Math.max(0, Number(jumpCycleIndexRef.current || 0));
    const chosen = matchingItems[cycleIdx % matchingItems.length];
    const targetIdxInPreFiltered = preFiltered.findIndex(a => a === chosen);

    requestAnimationFrame(() => requestAnimationFrame(() => {

      if (devModeRef.current) {
        setScrollToIdx(targetIdxInPreFiltered);
      } else {
        const normalizedQueryLocal = normalizeForSearch(rawQuery || '');
        let visibleFiltered;
        if (searchNormalized === normalizedQueryLocal && Array.isArray(filtered)) {
          visibleFiltered = filtered;
        } else {
          visibleFiltered = (achievementsRef.current || []).filter(a => {
            const tags = (a.tags || []).map(t => t.toUpperCase());
            const ft = debouncedFilterTagsRef.current || { include: [], exclude: [] };
            if (ft.include.length && !ft.include.every(tag => tags.includes(tag.toUpperCase()))) return false;
            if (ft.exclude.length && ft.exclude.some(tag => tags.includes(tag.toUpperCase()))) return false;
            if (normalizedQueryLocal) {
              const itemTokens = getItemTokens(a);
              if (!itemTokens || itemTokens.length === 0) return false;
              const qts = (normalizedQueryLocal || '').split(' ').filter(Boolean);
              if (!qts.every(qt => itemTokens.some(t => typeof t === 'string' && t.startsWith(qt)))) return false;
            }
            return true;
          });
        }

        const finalIdx = visibleFiltered.findIndex(a => a === chosen);
        const idxToUse = finalIdx === -1 ? 0 : finalIdx;
        setScrollToIdx(idxToUse);
        if (finalIdx === -1) {
          setNoMatchMessage('No matching achievement is currently visible with the active filters.');
          window.setTimeout(() => setNoMatchMessage(''), 3000);
        } else {
        }
      }
    }));

    try { pendingSearchJumpRef.current = null; } catch (e) { }
    try { searchJumpPendingRef.current = false; } catch (e) { }
  }, [debouncedManualSearch, filtered, searchLower]);



  const baseDev = devMode && (stagedReordered || reordered) ? (stagedReordered || reordered) : achievements;

  const devAchievements = useMemo(() => {
    try {
      return (baseDev ? sortList(baseDev) : baseDev);
    } catch (e) { return baseDev; }
  }, [baseDev, sortList]);

  const visibleList = devMode ? devAchievements : filtered;

  const visibleListRef = useRef(visibleList);
  useEffect(() => { visibleListRef.current = visibleList; }, [visibleList]);
  const devPanelRef = useRef(null);
  const devPanelOriginalParentRef = useRef(null);
  const hoverRafRef = useRef(null);
  const lastHoverIdxRef = useRef(null);

  useEffect(() => {
    try { if (devPanelRef.current && !devPanelOriginalParentRef.current) devPanelOriginalParentRef.current = devPanelRef.current.parentElement; } catch (e) { }
    return () => {
      if (hoverRafRef.current) {
        cancelAnimationFrame(hoverRafRef.current);
        hoverRafRef.current = null;
      }
    };
  }, []);

  const _onRowHoverEnter = useCallback((idx, ev) => {
    hoveredIdxRef.current = idx;
    if (lastHoverIdxRef.current === idx) return;
    lastHoverIdxRef.current = idx;

    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }

    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = null;
      const panel = devPanelRef.current;
      if (!panel) return;
      if (!devModeRef.current) {
        panel.style.display = 'none';
        return;
      }
      const list = visibleListRef.current || [];
      const item = list[idx];
      if (!item || hoveredIdxRef.current !== idx) {
        panel.style.display = 'none';
        return;
      }

      try {
        if (item && item.id && neighborContextRef && neighborContextRef.current) {
          try {
            const ctx = getAchievementContext(item, list, idx);
            neighborContextRef.current.set(item.id, ctx);
          } catch (e) { }
        }
      } catch (e) { }

      try {
        panel.style.display = 'block';
        const btnEdit = panel.querySelector('.devmode-btn-edit');
        const btnMoveUp = panel.querySelector('.devmode-btn-move-up');
        const btnMoveDown = panel.querySelector('.devmode-btn-move-down');
        const btnDup = panel.querySelector('.devmode-btn-duplicate');
        const btnDel = panel.querySelector('.devmode-btn-delete');

        if (btnEdit) btnEdit.disabled = !item;
        if (btnDup) btnDup.disabled = !item;
        if (btnDel) btnDel.disabled = !item;
        if (btnMoveUp) btnMoveUp.disabled = !item || idx <= 0;
        if (btnMoveDown) btnMoveDown.disabled = !item || idx >= (list.length - 1);
      } catch (e) {
      }

      try {
        let target = null;
        if (ev && ev.currentTarget) target = ev.currentTarget;
        else if (ev && ev.target) target = ev.target;
        else target = document.querySelector(`[data-index="${idx}"]`);
        const root = target && typeof target.closest === 'function' ? target.closest('.achievement-item') || target : target;
        if (root && root instanceof HTMLElement) {
          try {
            if (!devPanelOriginalParentRef.current && panel.parentElement) devPanelOriginalParentRef.current = panel.parentElement;
          } catch (err) { }

          const rect = root.getBoundingClientRect();
          panel.style.position = 'fixed';
          panel.style.left = `${rect.left + (root.clientWidth / 2)}px`;
          panel.style.top = `${rect.top + (root.clientHeight / 2)}px`;
          panel.style.transform = 'translate(-50%, -50%)';
          panel.style.pointerEvents = 'auto';

          const pad = 16;
          const pw = Math.min(360, Math.max(120, Math.floor(root.clientWidth - pad)));
          panel.style.width = `${pw}px`;

          const ph = panel.offsetHeight || 200;
          if (ph > (root.clientHeight - 16)) {
            panel.style.maxHeight = `${Math.max(80, root.clientHeight - 16)}px`;
            panel.style.overflowY = 'auto';
          } else {
            panel.style.maxHeight = '';
            panel.style.overflowY = '';
          }
        }
      } catch (err) {
      }
    });
  }, []);

  const _onRowHoverLeave = useCallback((idxOrEv, maybeEv) => {
    let idx = null;
    let ev = null;
    if (typeof idxOrEv === 'number') {
      idx = idxOrEv;
      ev = maybeEv;
    } else {
      ev = idxOrEv;
    }

    try {
      const panel = devPanelRef.current;
      const related = ev && (ev.relatedTarget || ev.toElement || (ev.nativeEvent && ev.nativeEvent.relatedTarget));
      if (related) {
        if (panel && panel.contains(related)) return;
        let root = null;
        if (ev && ev.currentTarget) root = (typeof ev.currentTarget.closest === 'function') ? (ev.currentTarget.closest('.achievement-item') || ev.currentTarget) : ev.currentTarget;
        else if (typeof idx === 'number') root = document.querySelector(`[data-index="${idx}"]`);
        if (root && root instanceof HTMLElement && root.contains(related)) return;
      }
    } catch (e) {
    }

    hoveredIdxRef.current = null;
    lastHoverIdxRef.current = null;
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    const panel = devPanelRef.current;
    if (panel) {
      panel.style.display = 'none';
      try { panel.style.transform = ''; panel.style.left = '-9999px'; panel.style.top = '-9999px'; panel.style.position = 'absolute'; } catch (e) { }
      try {
        const orig = devPanelOriginalParentRef.current;
        if (orig && panel.parentElement && panel.parentElement !== orig) {
          orig.appendChild(panel);
          panel.style.position = 'absolute';
          panel.style.left = '-9999px';
          panel.style.top = '-9999px';
          panel.style.width = '360px';
          panel.style.transform = '';
          panel.style.pointerEvents = '';
          panel.style.maxHeight = '';
          panel.style.overflowY = '';
        }
      } catch (err) { }
    }
  }, []);

  const _lastHoverTimeRef = useRef(0);
  const onRowHoverEnterCb = useCallback((idx, ev) => {
    try {
      if (!devModeRef.current) return;
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const THROTTLE_MS = 40;
      if (now - (_lastHoverTimeRef.current || 0) < THROTTLE_MS) return;
      _lastHoverTimeRef.current = now;
      _onRowHoverEnter(idx, ev);
    } catch (e) { }
  }, []);

  const onRowHoverLeaveCb = useCallback((idxOrEv, maybeEv) => {
    try {
      if (!devModeRef.current) return;
      _onRowHoverLeave(idxOrEv, maybeEv);
    } catch (e) { }
  }, []);

  const precomputedVisible = useMemo(() => {
    try {
      const arr = Array.isArray(visibleList) ? visibleList : [];
      return arr.map((a, i) => {
        const thumb = getThumbnailUrl(a, isMobile);
        const isDup = duplicateThumbKeys.has((thumb || '').trim());
        const autoThumbAvailable = a && a.levelID ? !!autoThumbMap[String(a.levelID)] : false;
        const computed = (i + 1);
        const displayRank = Number.isFinite(Number(computed)) ? Number(computed) + (Number(rankOffset) || 0) : computed;
        return { thumb, isDup, autoThumbAvailable, displayRank };
      });
    } catch (e) { return []; }
  }, [visibleList, isMobile, duplicateThumbKeys, autoThumbMap, rankOffset]);

  const handleMoveAchievementUpCb = useCallback((idx, ...args) => {
    const fn = handleMoveUpRef.current;
    if (typeof fn === 'function') return fn(idx, ...args);
  }, []);

  const handleMoveAchievementDownCb = useCallback((idx, ...args) => {
    const fn = handleMoveDownRef.current;
    if (typeof fn === 'function') return fn(idx, ...args);
  }, []);

  const handleEditAchievementCb = useCallback((idx, ...args) => {
    const fn = handleEditRef.current;
    if (typeof fn === 'function') return fn(idx, ...args);
  }, []);

  const handleRemoveAchievementCb = useCallback((idx, ...args) => {
    const fn = handleRemoveRef.current;
    if (typeof fn === 'function') return fn(idx, ...args);
  }, []);

  const handleDuplicateAchievementCb = useCallback((idx, ...args) => {
    const fn = handleDuplicateRef.current;
    if (typeof fn === 'function') return fn(idx, ...args);
  }, []);

  const listItemData = useMemo(() => ({
    filtered: visibleList,
    isMobile,
    duplicateThumbKeys,
    mode,
    devMode,
    autoThumbMap,
    showTiers: showTiers === true,
    usePlatformers,
    extraLists,
    rankOffset,
    hideRank,
    achievements,
    storageKeySuffix,
    dataFileName,
    handleMoveAchievementUp: handleMoveAchievementUpCb,
    handleMoveAchievementDown: handleMoveAchievementDownCb,
    handleEditAchievement: handleEditAchievementCb,
    handleDuplicateAchievement: handleDuplicateAchievementCb,
    handleRemoveAchievement: handleRemoveAchievementCb,
    onRowHoverEnter: onRowHoverEnterCb,
    onRowHoverLeave: onRowHoverLeaveCb,
    precomputedVisible,
  }), [visibleList, isMobile, duplicateThumbKeys, mode, devMode, autoThumbMap, showTiers, usePlatformers, extraLists, rankOffset, hideRank, achievements, storageKeySuffix, dataFileName, handleMoveAchievementUpCb, handleMoveAchievementDownCb, handleEditAchievementCb, handleDuplicateAchievementCb, handleRemoveAchievementCb, onRowHoverEnterCb, onRowHoverLeaveCb, precomputedVisible]);

  const ListRow = React.memo(function ListRow({ index, style, data }) {
    const {
      filtered, mode, devMode, showTiers,
      usePlatformers, extraLists, rankOffset, hideRank, achievements, storageKeySuffix, dataFileName,
      onRowHoverEnter, onRowHoverLeave, handleEditAchievement,
    } = data;
    const a = filtered[index];
    const itemStyle = { ...style, padding: 8, boxSizing: 'border-box' };
    const { isDup, autoThumbAvailable } = (data.precomputedVisible && data.precomputedVisible[index]) || {};

    return (
      <div data-index={index} data-achievement-id={(a && a.id) ? String(a.id) : ''} ref={el => { try { achievementRefs.current[index] = el; } catch (e) { } }} style={itemStyle} key={a && a.id ? a.id : index} className={`${isDup ? 'duplicate-thumb-item' : ''}`}>
        {mode === 'timeline' ?
          <TimelineAchievementCard
            achievement={a}
            previousAchievement={index > 0 ? filtered[index - 1] : null}
            onEdit={typeof handleEditAchievement === 'function' ? () => handleEditAchievement(index) : null}
            onHoverEnter={typeof onRowHoverEnter === 'function' ? (e) => onRowHoverEnter(index, e) : undefined}
            onHoverLeave={typeof onRowHoverLeave === 'function' ? (e) => onRowHoverLeave(index, e) : undefined}
            devMode={devMode}
            autoThumbAvailable={autoThumbAvailable}
            totalAchievements={filtered.length}
            achievements={filtered}
            showTiers={showTiers}
            mode={mode}
            usePlatformers={usePlatformers}
            extraLists={extraLists}
            listType={storageKeySuffix === 'legacy' || dataFileName === 'legacy.json' ? 'legacy' : (mode === 'timeline' || dataFileName === 'timeline.json' ? 'timeline' : 'main')}
          />
          :
          (() => {
            const computed = (index + 1);
            const displayRank = Number.isFinite(Number(computed)) ? Number(computed) + (Number(rankOffset) || 0) : computed;
            return <AchievementCard achievement={a} devMode={devMode} autoThumbAvailable={autoThumbAvailable} displayRank={displayRank} showRank={!hideRank} totalAchievements={achievements.length} achievements={achievements} mode={mode} usePlatformers={usePlatformers} showTiers={showTiers} extraLists={extraLists} listType={storageKeySuffix === 'legacy' || dataFileName === 'legacy.json' ? 'legacy' : (mode === 'timeline' || dataFileName === 'timeline.json' ? 'timeline' : 'main')} onEditHandler={handleEditAchievement} onEditIdx={index} onHoverEnter={typeof onRowHoverEnter === 'function' ? (e) => onRowHoverEnter(index, e) : undefined} onHoverLeave={typeof onRowHoverLeave === 'function' ? (e) => onRowHoverLeave(index, e) : undefined} />;
          })()
        }
      </div>
    );
  }, (prev, next) => {
    if (prev.index !== next.index) return false;
    const p = prev.data;
    const n = next.data;
    const pi = prev.index;
    const ni = next.index;
    const pItem = (p.filtered || [])[pi] || null;
    const nItem = (n.filtered || [])[ni] || null;
    const pId = pItem && pItem.id;
    const nId = nItem && nItem.id;
    if (String(pId) !== String(nId)) return false;

    if (p.devMode !== n.devMode) return false;
    if (p.showTiers !== n.showTiers) return false;
    if (p.usePlatformers !== n.usePlatformers) return false;
    if (p.mode !== n.mode) return false;
    if (p.hideRank !== n.hideRank) return false;
    const pThumb = getThumbnailUrl(pItem, p.isMobile);
    const nThumb = getThumbnailUrl(nItem, n.isMobile);
    const pDup = p.duplicateThumbKeys && p.duplicateThumbKeys.has((pThumb || '').trim());
    const nDup = n.duplicateThumbKeys && n.duplicateThumbKeys.has((nThumb || '').trim());
    if (pDup !== nDup) return false;
    const pAuto = pItem && pItem.levelID ? !!p.autoThumbMap[String(pItem.levelID)] : false;
    const nAuto = nItem && nItem.levelID ? !!n.autoThumbMap[String(nItem.levelID)] : false;
    if (pAuto !== nAuto) return false;
    const pr = (pi + 1);
    const nr = (ni + 1);
    const pDisp = Number.isFinite(Number(pr)) ? Number(pr) + (Number(p.rankOffset) || 0) : pr;
    const nDisp = Number.isFinite(Number(nr)) ? Number(nr) + (Number(n.rankOffset) || 0) : nr;
    if (pDisp !== nDisp) return false;
    return true;
  });

  useEffect(() => {
    const items = (reordered && Array.isArray(reordered) && reordered.length) ? reordered : achievements;
    const ids = Array.from(new Set((items || []).map(a => (a && a.levelID) ? String(a.levelID) : '').filter(Boolean)));
    if (!ids.length) return;
    ids.forEach(id => {
      if (autoThumbMap[id] !== undefined) return;
      const url = `https://levelthumbs.prevter.me/thumbnail/${id}`;

      fetch(url, { method: 'HEAD' }).then(res => {
        if (res && res.ok) {
          const ct = res.headers.get ? (res.headers.get('content-type') || '') : '';
          const available = ct.startsWith && ct.startsWith('image/') ? true : true;
          setAutoThumbMap(m => ({ ...m, [id]: available }));
        } else {
          setAutoThumbMap(m => ({ ...m, [id]: false }));
        }
      }).catch(() => {

        fetch(url, { method: 'GET' }).then(res2 => {
          if (res2 && res2.ok) setAutoThumbMap(m => ({ ...m, [id]: true }));
          else setAutoThumbMap(m => ({ ...m, [id]: false }));
        }).catch(() => setAutoThumbMap(m => ({ ...m, [id]: false })));
      });
    });
  }, [achievements, reordered, autoThumbMap]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const key = `thal_autoThumbMap_${storageKeySuffix}`;
      window.localStorage.setItem(key, JSON.stringify(autoThumbMap || {}));
    } catch (e) {
    }
  }, [autoThumbMap, storageKeySuffix]);

  function handleMobileToggle() {
    setShowMobileFilters(v => !v);
  }


  function getPasteCandidates() {
    const q = (debouncedPasteSearch || '').trim().toLowerCase();
    if (!q) return [];
    const idxArr = (pasteIndexRef.current && pasteIndexRef.current.length) ? pasteIndexRef.current : pasteIndex || [];
    const prefixMap = pastePrefixMapRef.current || new Map();

    const tokens = q.split(' ').filter(Boolean);
    if (!tokens.length) return [];

    let resultSet = null;
    for (let t of tokens) {
      const key = t;
      const s = prefixMap.get(key);
      if (!s || s.length === 0) {
        resultSet = [];
        break;
      }
      if (resultSet === null) {
        resultSet = new Set(s);
      } else {
        for (const v of Array.from(resultSet)) {
          if (!s.includes(v)) resultSet.delete(v);
        }
      }
      if (!resultSet || resultSet.size === 0) break;
    }

    const out = [];
    if (resultSet && resultSet.size) {
      for (const idx of resultSet) {
        if (out.length >= 50) break;
        const e = idxArr[idx];
        if (e && e.achievement) out.push(e.achievement);
      }
      return out;
    }

    for (let i = 0; i < idxArr.length && out.length < 50; i++) {
      const entry = idxArr[i];
      if (!entry || !entry.searchable) continue;
      if (entry.searchable.indexOf(q) !== -1) out.push(entry.achievement);
    }
    return out;
  }

  useEffect(() => {
    if (!pasteShowResults || !pasteSearch) return;
    EXTRA_FILES.forEach(fn => {
      if (extraLists[fn] !== undefined) return;
      const url = `/${fn}`;
      fetch(url).then(res => res.json()).then(data => {
        const list = Array.isArray(data) ? data : (data.achievements || []);
        setExtraLists(prev => ({ ...prev, [fn]: list }));
      }).catch(() => {
        setExtraLists(prev => ({ ...prev, [fn]: [] }));
      });
    });
  }, [pasteShowResults, pasteSearch]);

  useEffect(() => {
    (async () => {
      try {
        const base = (devMode && reordered) ? reordered || [] : achievements || [];
        const extras = Object.values(extraLists).flat().filter(Boolean);
        const items = [...base, ...extras];
        const sig = _makePasteSignature(items);
        let cached = null;
        if (sig && _pasteIndexCache.has(sig)) {
          cached = _pasteIndexCache.get(sig);
        }
        if (cached) {
          pasteIndexRef.current = cached.idx;
          pastePrefixMapRef.current = cached.prefixMap || new Map();
          setPasteIndex(pasteIndexRef.current || []);
          return;
        }

        if (workerRef && workerRef.current) {
          try {
            const res = await postWorkerMessage('buildPasteIndex', { items, maxPrefix: 20 });
            const idx = (res && res.idx) ? res.idx : [];
            const prefixMapObj = (res && res.prefixMap) ? res.prefixMap : {};
            const prefixMap = new Map(Object.entries(prefixMapObj).map(([k, v]) => [k, Array.isArray(v) ? v : []]));
            try { if (sig) _pasteIndexCache.set(sig, { idx, prefixMap }); } catch (e) { }
            pasteIndexRef.current = idx;
            pastePrefixMapRef.current = prefixMap;
            setPasteIndex(pasteIndexRef.current || []);
            return;
          } catch (e) {
          }
        }

        const idxLocal = new Array(items.length);
        const prefixMapLocal = new Map();
        const maxPrefix = 20;
        for (let i = 0; i < items.length; i++) {
          const a = items[i];
          const searchable = [a && a.name, a && a.player, a && a.id, a && a.levelID, a && a.submitter, (a && a.tags) ? (a.tags.join(' ')) : '']
            .filter(Boolean).join(' ').toLowerCase();
          idxLocal[i] = { achievement: a, searchable };
          const toks = (searchable || '').split(/\s+/).filter(Boolean);
          toks.forEach(tok => {
            const capped = String(tok).slice(0, maxPrefix);
            for (let p = 1; p <= capped.length; p++) {
              const key = capped.slice(0, p);
              const arr = prefixMapLocal.get(key) || [];
              arr.push(i);
              if (!prefixMapLocal.has(key)) prefixMapLocal.set(key, arr);
            }
          });
        }
        try { if (sig) _pasteIndexCache.set(sig, { idx: idxLocal, prefixMap: prefixMapLocal }); } catch (e) { }
        pasteIndexRef.current = idxLocal;
        pastePrefixMapRef.current = prefixMapLocal;
        setPasteIndex(pasteIndexRef.current || []);
      } catch (e) {
        try { pasteIndexRef.current = pasteIndexRef.current || []; setPasteIndex(pasteIndexRef.current || []); } catch (ee) { }
      }
    })();
  }, [achievements, extraLists, devMode, reordered, debouncedPasteSearch]);

  function handlePasteSelect(item) {
    if (!item) return;
    const entry = { ...item };
    entry.version = Number(entry.version) || 2;
    entry.levelID = Number(entry.levelID) || 0;
    entry.length = Number(entry.length) || 0;

    if (editIdx !== null && editForm) {
      setEditForm({ ...editForm, ...entry });
      setEditFormTags(Array.isArray(entry.tags) ? [...entry.tags] : []);
      setEditFormCustomTags('');
    } else {
      setNewForm(prev => ({ ...prev, ...entry }));
      setNewFormTags(Array.isArray(entry.tags) ? [...entry.tags] : []);
      setNewFormCustomTags('');
      setShowNewForm(true);
      try { setInsertIdx(getMostVisibleIdx()); } catch (e) { }
    }
    setPasteSearch('');
    setPasteShowResults(false);
  }









  const { getMostVisibleIdx } = useScrollPersistence({
    storageKey: `thal_scroll_index_${storageKeySuffix}`,
    items: achievements,
    devMode,
    listRef,
    itemRefs: achievementRefs,
    setScrollToIdx,
  });

  function handleRemoveAchievement(idx) {
    const realIdx = resolveRealIdx(idx);
    if (realIdx == null || realIdx < 0) return;
    batchUpdateReordered(arr => {
      if (!arr) return arr;
      arr.splice(realIdx, 1);
      return arr;
    });
  }

  function handleDuplicateAchievement(idx) {
    const realIdx = resolveRealIdx(idx);
    if (realIdx == null || realIdx < 0) return;
    const orig = (stagedRef.current && stagedRef.current[realIdx]) || (reorderedRef.current && reorderedRef.current[realIdx]) || {};
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newId = (orig && orig.id) ? `${orig.id}-copy-${uniqueSuffix}` : `new-${uniqueSuffix}`;
    const copy = { ...orig, id: newId };
    const enhancedCopy = enhanceAchievement(copy);
    if (stagedRef.current) {
      setStagedReordered(prev => {
        const arr = Array.isArray(prev) ? prev.slice() : [];
        arr.splice(realIdx + 1, 0, enhancedCopy);
        try { return mapEnhanceArray(arr, achievementsRef.current || prev || []); } catch (e) { return arr; }
      });
    } else {
      batchUpdateReordered(arr => {
        if (!arr) return arr;
        arr.splice(realIdx + 1, 0, enhancedCopy);
        return arr;
      });
    }
    setScrollToIdx(realIdx + 1);
  }

  useEffect(() => {
    try {
      handleMoveUpRef.current = handleMoveAchievementUp;
      handleMoveDownRef.current = handleMoveAchievementDown;
      handleEditRef.current = handleEditAchievement;
      handleRemoveRef.current = handleRemoveAchievement;
      handleDuplicateRef.current = handleDuplicateAchievement;
      handleCopyRef.current = handleCopyItemJson;
    } catch (e) { }
  });



  function handleCopyItemJson() {
    try {
      const idx = hoveredIdxRef.current;
      const list = visibleListRef.current || [];
      if (idx == null || idx < 0 || idx >= list.length) return;
      const item = list[idx];
      if (!item) return;
      const sanitized = JSON.parse(JSON.stringify(item));
      const json = JSON.stringify(sanitized, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(json).then(() => {
          try { alert('Copied achievement JSON to clipboard'); } catch (e) { }
        }).catch(() => {
          try {
            const t = document.createElement('textarea');
            t.value = json;
            document.body.appendChild(t);
            t.select();
            document.execCommand('copy');
            document.body.removeChild(t);
            alert('Copied achievement JSON to clipboard');
          } catch (e) {
          }
        });
      } else {
        try {
          const t = document.createElement('textarea');
          t.value = json;
          document.body.appendChild(t);
          t.select();
          document.execCommand('copy');
          document.body.removeChild(t);
          alert('Copied achievement JSON to clipboard');
        } catch (e) {
        }
      }
    } catch (e) {
    }
  }

  const onImportAchievementsJson = useCallback((json) => {
    let imported = Array.isArray(json) ? json : (json && json.achievements) || [];
    if (!Array.isArray(imported)) {
      alert(`Invalid ${usePlatformers ? 'platformers.json' : dataFileName} format.`);
      return;
    }
    imported = imported.map(a => ({ ...a }));
    imported = mapEnhanceArray(imported, achievementsRef.current || []);
    try {
      const idx = typeof getMostVisibleIdx === 'function' ? getMostVisibleIdx() : null;
      reorderedRef.current = imported;
      batchUpdateReordered(() => imported);
      if (!devModeRef.current) {
        devModeRef.current = true;
        setDevMode(true);
      }
      if (idx !== null && typeof setScrollToIdx === 'function') {
        requestAnimationFrame(() => requestAnimationFrame(() => setScrollToIdx(idx)));
      }
    } catch (e) {
      reorderedRef.current = imported;
      batchUpdateReordered(() => imported);
      if (!devModeRef.current) {
        devModeRef.current = true;
        setDevMode(true);
      }
    }
    alert(`Imported ${usePlatformers ? 'platformers.json' : dataFileName}!`);
  }, [getMostVisibleIdx, setScrollToIdx, usePlatformers, dataFileName]);



  return (
    <>
      <style>{`.achievement-item:hover .hover-menu{ opacity: 1 !important; pointer-events: auto !important; } .hover-menu{ will-change: opacity; } .hover-menu.hover-menu--disabled{ opacity: 0 !important; pointer-events: none !important; }`}</style>
      <Head>
        <title>The Hardest Achievements List</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/assets/favicon-96x96.png" sizes="96x96" />
        <link rel="shortcut icon" href="/assets/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="THAL" />
        <link rel="manifest" href="/assets/site.webmanifest" />
        <meta
          name="description"
          content="This Geometry Dash list ranks rated, unrated, challenges, runs, speedhacked, low refresh rate, (and more) all under one list."
        />
      </Head>
      <Background bgImage={bgImage} />
      <header className="main-header">
        <div
          className="header-bar"
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 0 : 16,
            width: '100%',
            paddingBottom: isMobile ? 8 : 0
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
            <button
              id="mobile-hamburger-btn"
              className="mobile-hamburger-btn"
              type="button"
              aria-label="Open sidebar"
              title="Open sidebar menu"
              onClick={() => isMobile && setShowSidebar(true)}
              style={{ marginRight: 12 }}
            >
              <span className="bi bi-list hamburger-icon" aria-hidden="true"></span>
            </button>
            <div className="logo">
              <img src="/assets/favicon-96x96.png" alt="The Hardest Achievements List Logo" title="The Hardest Achievements List Logo" className="logo-img" />
            </div>
            <h1 className="title main-title" style={{ marginLeft: 12, fontSize: isMobile ? 22 : undefined, lineHeight: 1.1 }}>
              The Hardest Achievements List
            </h1>
          </div>
          {isMobile && (
            <div style={{ width: '100%', marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                {showPlatformToggle && (
                  <label className="pill-toggle" data-variant="platformer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--muted, #DFE3F5)', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={usePlatformers}
                      onChange={e => {
                        const next = !!e.target.checked;
                        setUsePlatformers(next);
                        try { localStorage.setItem('usePlatformers', next ? '1' : '0'); } catch (err) { }
                      }}
                    />
                    <span
                      className="track"
                      role="switch"
                      aria-checked={usePlatformers}
                      tabIndex={0}
                    >
                      <span className="inner-label label-left">Classic</span>
                      <span className="thumb" aria-hidden="true" />
                      <span className="inner-label label-right">Platformer</span>
                    </span>
                  </label>
                )}
              </div>
              <div className="tag-filter-pills-container" style={{ width: '100%' }}>
                <TagFilterPills
                  allTags={allTags}
                  filterTags={filterTags}
                  setFilterTags={handleSetFilterTags}
                  isMobile={isMobile}
                  show={showMobileFilters}
                  setShow={setShowMobileFilters}
                />
              </div>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <button
                  ref={mobileBtnRef}
                  id="mobile-filter-toggle-btn"
                  aria-label={showMobileFilters ? 'Hide Filters' : 'Show Filters'}
                  onClick={handleMobileToggle}
                  className="mobile-filter-toggle"
                >
                  <span className="arrow-img-wrapper">
                    <img
                      src={showMobileFilters ? "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-up.svg" : "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-down.svg"}
                      alt={showMobileFilters ? "Hide Filters" : "Show Filters"}
                      className="arrow-img"
                    />
                  </span>
                </button>
              </div>
            </div>
          )}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
                <label style={{ color: 'var(--text-color)', fontSize: 13 }}>Sort:</label>
                <select
                  aria-label="Sort achievements"
                  value={sortKey}
                  onChange={e => {
                    const v = e.target.value;
                    setSortKey(v);
                    try { localStorage.setItem(`thal_sort_key_${storageKeySuffix}`, v); } catch (err) { }
                  }}
                  style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--primary-bg)', color: 'var(--text-color)', border: '1px solid var(--hover-bg)' }}
                >
                  <option value="rank">Rank (Default)</option>
                  <option value="name">Name</option>
                  <option value="length">Length</option>
                  <option value="levelID">Level ID</option>
                  <option value="random">Random</option>
                  <option value="date">Date</option>
                </select>
                <button
                  aria-label="Toggle sort direction"
                  title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                  onClick={() => {
                    const next = sortDir === 'asc' ? 'desc' : 'asc';
                    setSortDir(next);
                    try { localStorage.setItem(`thal_sort_dir_${storageKeySuffix}`, next); } catch (err) { }
                  }}
                  style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--primary-accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {sortDir === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              {showPlatformToggle && (
                <label className="pill-toggle" data-variant="platformer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--muted, #DFE3F5)', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={usePlatformers}
                    onChange={e => {
                      const next = !!e.target.checked;
                      setUsePlatformers(next);
                      try { localStorage.setItem('usePlatformers', next ? '1' : '0'); } catch (err) { }
                    }}
                  />
                  <span
                    className="track"
                    role="switch"
                    aria-checked={usePlatformers}
                    tabIndex={0}
                  >
                    <span className="inner-label label-left">Classic</span>
                    <span className="thumb" aria-hidden="true" />
                    <span className="inner-label label-right">Platformer</span>
                  </span>
                </label>
              )}
            </div>
          )}
        </div>
        {!isMobile && (
          <div className="tag-filter-pills-container">
            <TagFilterPills
              allTags={allTags}
              filterTags={filterTags}
              setFilterTags={handleSetFilterTags}
              isMobile={isMobile}
              show={showMobileFilters}
              setShow={setShowMobileFilters}
            />
          </div>
        )}
      </header>
      <MobileSidebarOverlay
        isOpen={isMobile && showSidebar}
        onClose={() => setShowSidebar(false)}
      />
      <main className="main-content achievements-main">
        {!isMobile && <Sidebar />}
        <section className="achievements achievements-section">
          <div style={{ width: '100%' }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: 'min(95vw, 902px)', margin: '0 auto' }}>
              <input
                type="text"
                placeholder="Search achievements..."
                ref={searchInputRef}
                defaultValue={search}
                onChange={handleVisibleInputChange}
                onKeyDown={handleSearchKeyDown}
                aria-label="Search achievements"
                className="search-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <DevModePanel
            devMode={devMode}
            achievements={achievements}
            reordered={reordered}
            stagedReordered={stagedReordered}
            originalAchievements={originalAchievements}
            originalSnapshotRef={originalSnapshotRef}
            batchUpdateReordered={batchUpdateReordered}
            setReordered={setReordered}
            setStagedReordered={setStagedReordered}
            setEditIdx={setEditIdx}
            editIdx={editIdx}
            editForm={editForm}
            setEditForm={setEditForm}
            editFormTags={editFormTags}
            setEditFormTags={setEditFormTags}
            editFormCustomTags={editFormCustomTags}
            setEditFormCustomTags={setEditFormCustomTags}
            AVAILABLE_TAGS={AVAILABLE_TAGS}
            showNewForm={showNewForm}
            newForm={newForm}
            setNewForm={setNewForm}
            newFormTags={newFormTags}
            setNewFormTags={setNewFormTags}
            newFormCustomTags={newFormCustomTags}
            setNewFormCustomTags={setNewFormCustomTags}
            setShowNewForm={setShowNewForm}
            pasteSearch={pasteSearch}
            setPasteSearch={setPasteSearch}
            pasteShowResults={pasteShowResults}
            setPasteShowResults={setPasteShowResults}
            getPasteCandidates={getPasteCandidates}
            getMostVisibleIdx={getMostVisibleIdx}
            listRef={listRef}
            visibleListRef={visibleListRef}
            achievementRefs={achievementRefs}
            storageKeySuffix={storageKeySuffix}
            dataFileName={usePlatformers ? (dataFileName.includes('timeline') ? 'platformertimeline.json' : 'platformers.json') : dataFileName}
            usePlatformers={usePlatformers}
            setDuplicateThumbKeys={setDuplicateThumbKeys}
            setDevMode={setDevMode}
            setScrollToIdx={setScrollToIdx}
            setInsertIdx={setInsertIdx}
            insertIdx={insertIdx}
            devAchievements={devAchievements}
            handlePasteSelect={handlePasteSelect}
            onImportAchievementsJson={onImportAchievementsJson}
          />
          <div style={{ position: 'relative', width: '100%' }}>
            <ListWindow
              ref={listRef}
              height={Math.min(720, (typeof window !== 'undefined' ? window.innerHeight - 200 : 720))}
              itemCount={(visibleList || []).length}
              itemSize={150}
              overscanCount={(typeof window !== 'undefined' && window.innerWidth <= 480) ? 20 : 8}
              width={'100%'}
              style={{ overflowX: 'hidden' }}
              itemData={listItemData}
              itemKey={(index, data) => {
                try {
                  const it = (data && data.filtered && data.filtered[index]) || null;
                  return (it && it.id != null) ? String(it.id) : index;
                } catch (e) { return index; }
              }}
              onItemsRendered={() => { }}
            >
              {ListRow}
            </ListWindow>

            {!isPending && (!visibleList || visibleList.length === 0) && (
              <div className="no-achievements" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>No achievements found.</div>
            )}
          </div>
        </section>
      </main>
      <DevHoverPanelMemo
        devMode={devMode}
        devPanelRef={devPanelRef}
        hoveredIdxRef={hoveredIdxRef}
        visibleListRef={visibleListRef}
        handleEditRef={handleEditRef}
        handleMoveUpRef={handleMoveUpRef}
        handleMoveDownRef={handleMoveDownRef}
        handleDuplicateRef={handleDuplicateRef}
        handleRemoveRef={handleRemoveRef}
        handleCopyRef={handleCopyRef}
      />

      {showChangelogPreview && changelogPreview && (
        <div className="changelog-modal" style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000, background: 'var(--secondary-bg, #121212)', color: 'var(--text-color)', padding: 12, borderRadius: 8, width: '80%', maxWidth: 900, maxHeight: '80vh', boxShadow: '0 8px 32px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Changelog Preview ({changelogPreview.length} entries)</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => {
                try {
                  const text = changelogPreview.join('\n\n');
                  if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    navigator.clipboard.writeText(text).then(() => alert('Changelog copied to clipboard!')).catch(() => alert('Failed to copy'));
                  } else {
                    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); alert('Changelog copied to clipboard!');
                  }
                } catch (e) { alert('Failed to copy changelog'); }
              }} className="devmode-btn">Copy</button>
              <button onClick={() => { setShowChangelogPreview(false); setChangelogPreview(null); }} className="devmode-btn">Close</button>
            </div>
          </div>
          <div style={{ height: 'calc(100% - 44px)', padding: 6 }}>
            <ListWindow height={Math.min(600, changelogPreview.length * 56)} itemCount={changelogPreview.length} itemSize={56} width={'100%'}>
              {({ index, style }) => (
                <div style={{ ...style, padding: 8, boxSizing: 'border-box', borderBottom: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.3 }}>{changelogPreview[index]}</div>
                </div>
              )}
            </ListWindow>
          </div>
        </div>
      )}

      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
        {noMatchMessage}
      </div>
    </>
  );
});

const TagFilterPills = React.memo(TagFilterPillsInner, (prev, next) => {
  return prev.allTags === next.allTags && prev.filterTags === next.filterTags && prev.isMobile === next.isMobile && prev.show === next.show;
});

const DevHoverPanelMemo = React.memo(function DevHoverPanelMemo({ devMode, devPanelRef, hoveredIdxRef, visibleListRef, handleEditRef, handleMoveUpRef, handleMoveDownRef, handleDuplicateRef, handleRemoveRef, handleCopyRef }) {
  const onEdit = (e) => {
    try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; const list = (visibleListRef && visibleListRef.current) ? visibleListRef.current : []; const itm = list[i]; if (handleEditRef && handleEditRef.current) { if (itm && itm.id) handleEditRef.current(itm.id); else handleEditRef.current(i); } } catch (err) { }
  };
  const onMoveUp = (e) => { try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; const list = (visibleListRef && visibleListRef.current) ? visibleListRef.current : []; const itm = list[i]; const arg = itm && itm.id ? String(itm.id) : i; if (handleMoveUpRef && handleMoveUpRef.current) handleMoveUpRef.current(arg); } catch (err) { } };
  const onMoveDown = (e) => { try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; const list = (visibleListRef && visibleListRef.current) ? visibleListRef.current : []; const itm = list[i]; const arg = itm && itm.id ? String(itm.id) : i; if (handleMoveDownRef && handleMoveDownRef.current) handleMoveDownRef.current(arg); } catch (err) { } };
  const onDuplicate = (e) => { try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; if (handleDuplicateRef && handleDuplicateRef.current) handleDuplicateRef.current(i); } catch (err) { } };
  const onDelete = (e) => { try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; if (handleRemoveRef && handleRemoveRef.current) handleRemoveRef.current(i); } catch (err) { } };
  const onCopy = (e) => { try { e.preventDefault(); e.stopPropagation(); if (handleCopyRef && handleCopyRef.current) handleCopyRef.current(); } catch (err) { } };

  const baseStyle = { display: devMode ? 'block' : 'none', position: 'absolute', left: -9999, top: -9999, width: 360, maxHeight: '60vh', overflow: 'auto', background: 'var(--secondary-bg, #1a1a1a)', color: 'var(--text-color, #fff)', padding: 12, borderRadius: 8, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.6)' };

  return (
    <div ref={devPanelRef} className="devmode-hover-panel" style={baseStyle}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-edit" title="Edit" aria-label="Edit" onClick={onEdit}><EditIcon width={16} height={16} /></button>
          <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-move-up" title="Move Up" aria-label="Move Up" onClick={onMoveUp}><UpIcon width={16} height={16} /></button>
          <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-move-down" title="Move Down" aria-label="Move Down" onClick={onMoveDown}><DownIcon width={16} height={16} /></button>
          <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-duplicate" title="Duplicate" aria-label="Duplicate" onClick={onDuplicate}><AddIcon width={16} height={16} /></button>
          <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-delete" title="Delete" aria-label="Delete" onClick={onDelete} style={{ background: '#dc3545', color: '#fff', borderColor: 'rgba(220,53,69,0.9)' }}><DeleteIcon width={16} height={16} /></button>
          <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-copy" title="Copy JSON" aria-label="Copy JSON" onClick={onCopy}><CopyIcon width={16} height={16} /></button>
        </div>
      </div>
    </div>
  );
});
