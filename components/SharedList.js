import Head from 'next/head';
import React, { useEffect, useState, useMemo, useRef, useCallback, useTransition, memo } from 'react';
import { VariableSizeList as ListWindow } from 'react-window';
import Link from 'next/link';
import { useRouter } from 'next/router';

import Sidebar from '../components/Sidebar';
import Background from '../components/Background';
import { useDateFormat } from '../components/DateFormatContext';
import Tag, { TAG_PRIORITY_ORDER } from '../components/Tag';
import DevModePanel from '../components/DevModePanel';
import MobileSidebarOverlay from '../components/MobileSidebarOverlay';
import { useScrollPersistence } from '../hooks/useScrollPersistence';

const AVAILABLE_TAGS = [
  "Level", "Challenge", "Platformer", "Verified", "Deathless", "Coin Route", "Low Hertz", "Mobile", "Speedhack",
  "Noclip", "Miscellaneous", "Progress", "Consistency", "Speedrun",
  "2P", "CBF", "Rated", "Formerly Rated", "Outdated Version", "Tentative"
];

function normalizeYoutubeUrl(input) {
  if (!input || typeof input !== 'string') return input;
  const s = input.trim();

  let m = s.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?&#\/]+)/i);
  if (m) {
    const id = m[1];
    try {
      const parsedShort = new URL(s.startsWith('http') ? s : `https://${s}`);
      const t = parsedShort.searchParams.get('t') || parsedShort.searchParams.get('start') || parsedShort.searchParams.get('time_continue');
      if (t) return `https://www.youtube.com/watch?v=${id}&t=${t}`;
    } catch (e) {
    }
    return `https://youtu.be/${id}`;
  }

  let parsed;
  try {
    parsed = new URL(s.startsWith('http') ? s : `https://${s}`);
  } catch (err) {
    m = s.match(/[?&]v=([^?&#]+)/);
    if (m) return `https://youtu.be/${m[1]}`;
    m = s.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([^?&#\/]+)/i);
    if (m) return `https://youtu.be/${m[1]}`;
    m = s.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?&#\/]+)/i);
    if (m) return `https://youtu.be/${m[1]}`;
    return input;
  }

  const host = parsed.hostname.toLowerCase();

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    if (id) {
      const t = parsed.searchParams.get('t') || parsed.searchParams.get('start') || parsed.searchParams.get('time_continue');
      if (t) return `https://www.youtube.com/watch?v=${id}&t=${t}`;
      return `https://youtu.be/${id}`;
    }
    const raw = parsed.pathname.replace(/^\//, '');
    const t = parsed.searchParams.get('t') || parsed.searchParams.get('start') || parsed.searchParams.get('time_continue');
    if (t) return `https://www.youtube.com/watch?v=${raw}&t=${t}`;
    return `https://youtu.be/${raw}`;
  }

  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const v = parsed.searchParams.get('v');
    if (v) {
      const t = parsed.searchParams.get('t') || parsed.searchParams.get('start') || parsed.searchParams.get('time_continue');
      return t ? `https://www.youtube.com/watch?v=${v}&t=${t}` : `https://www.youtube.com/watch?v=${v}`;
    }

    const path = parsed.pathname || '';
    let parts = path.split('/').filter(Boolean);

    const liveIdx = parts.indexOf('live');
    if (liveIdx !== -1 && parts[liveIdx + 1]) {
      const id = parts[liveIdx + 1];
      const t = parsed.searchParams.get('t') || parsed.searchParams.get('start') || parsed.searchParams.get('time_continue');
      return t ? `https://www.youtube.com/watch?v=${id}&t=${t}` : `https://www.youtube.com/watch?v=${id}`;
    }

    const shortsIdx = parts.indexOf('shorts');
    if (shortsIdx !== -1 && parts[shortsIdx + 1]) {
      const id = parts[shortsIdx + 1];
      const t = parsed.searchParams.get('t') || parsed.searchParams.get('start') || parsed.searchParams.get('time_continue');
      return t ? `https://www.youtube.com/watch?v=${id}&t=${t}` : `https://www.youtube.com/watch?v=${id}`;
    }

    return parsed.href;
  }

  return null;
}

function sanitizeImageUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  if (s.startsWith('data:')) {
    if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(s)) return s;
    return null;
  }
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    if (u.protocol !== 'https:') return null;
    return u.href;
  } catch (e) {
    return null;
  }
}

function TagFilterPillsInner({ allTags, filterTags, setFilterTags, isMobile, show, setShow }) {
  const tagStates = {};
  allTags.forEach(tag => {
    if (filterTags.include.includes(tag)) tagStates[tag] = 'include';
    else if (filterTags.exclude.includes(tag)) tagStates[tag] = 'exclude';
    else tagStates[tag] = 'neutral';
  });

  function handlePillClick(tag) {
    if (tagStates[tag] === 'neutral') setFilterTags(prev => ({ ...prev, include: [...prev.include, tag] }));
    else if (tagStates[tag] === 'include') setFilterTags(prev => ({ ...prev, include: prev.include.filter(t => t !== tag), exclude: [...prev.exclude, tag] }));
    else setFilterTags(prev => ({ ...prev, exclude: prev.exclude.filter(t => t !== tag) }));
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
        allTags.sort((a, b) => TAG_PRIORITY_ORDER.indexOf(a.toUpperCase()) - TAG_PRIORITY_ORDER.indexOf(b.toUpperCase())).map(tag => (
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
}

function formatDate(date, dateFormat) {
  if (!date) return 'N/A';

  if (typeof date === 'string' && date.includes('?')) return date;
  const d = new Date(date);
  if (isNaN(d)) return 'N/A';
  d.setDate(d.getDate() + 1);
  const yy = String(d.getFullYear()).slice(-2);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  if (dateFormat === 'YYYY/MM/DD') return `${yyyy}/${mm}/${dd}`;
  if (dateFormat === 'MM/DD/YY') return `${mm}/${dd}/${yy}`;
  if (dateFormat === 'DD/MM/YY') return `${dd}/${mm}/${yy}`;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const AchievementCard = memo(function AchievementCard({ achievement, devMode }) {
  const { dateFormat } = useDateFormat();
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
        style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
        onClick={handleClick}
        onMouseDown={handleClick}
        tabIndex={devMode ? -1 : 0}
        aria-disabled={devMode ? 'true' : undefined}
      >
        <div
          className="achievement-item"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="rank-date-container">
            <div className="achievement-length">
              {achievement.length ? `${Math.floor(achievement.length / 60)}:${(achievement.length % 60).toString().padStart(2, '0')}` : 'N/A'}
            </div>
            <div className="achievement-date">
              {achievement.date ? formatDate(achievement.date, dateFormat) : 'N/A'}
            </div>
            <div className="rank"><strong>#{achievement.rank}</strong></div>
          </div>
          <div className="tag-container">
            {(achievement.tags || []).sort((a, b) => TAG_PRIORITY_ORDER.indexOf(a.toUpperCase()) - TAG_PRIORITY_ORDER.indexOf(b.toUpperCase())).map(tag => (
              <Tag tag={tag} key={tag} />
            ))}
          </div>
          <div className="achievement-details">
            <div className="text">
              <h2>{achievement.name}</h2>
              <p>{achievement.player}</p>
            </div>
            <div className="thumbnail-container">
              <img src={sanitizeImageUrl(achievement.thumbnail) || (achievement.levelID ? `https://levelthumbs.prevter.me/thumbnail/${achievement.levelID}` : '/assets/default-thumbnail.png')} alt={achievement.name} loading="lazy" />
            </div>
          </div>
        </div>
      </a>
    </Link>
  );
}, (prev, next) => prev.achievement === next.achievement && prev.devMode === next.devMode);

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export default function SharedList({
  dataUrl = '/achievements.json',
  dataFileName = 'achievements.json',
  storageKeySuffix = 'achievements'
}) {
  const [achievements, setAchievements] = useState([]);
  const [usePlatformers, setUsePlatformers] = useState(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem('usePlatformers') : null;
      return v === '1' || v === 'true';
    } catch (e) {
      return false;
    }
  });
  const [visibleCount, setVisibleCount] = useState(100);
  const [searchJumpPending, setSearchJumpPending] = useState(false);
  const listRef = useRef(null);
  const [search, setSearch] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(null);
  const [noMatchMessage, setNoMatchMessage] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);

  function handleSearchKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const rawQuery = (search || '').trim();
    const query = rawQuery.toLowerCase();
    if (!query) return;

    const matchesQuery = a => {
      if (!a) return false;
      const candidates = [a.name, a.player, a.id, a.levelID, a.submitter, (a.tags || []).join(' ')].filter(Boolean);
      return candidates.some(c => String(c).toLowerCase().includes(query));
    };

    const respectsTagFilters = a => {
      const tags = (a.tags || []).map(t => t.toUpperCase());
      if (filterTags.include.length && !filterTags.include.every(tag => tags.includes(tag.toUpperCase()))) return false;
      if (filterTags.exclude.length && filterTags.exclude.some(tag => tags.includes(tag.toUpperCase()))) return false;
      return true;
    };

    const baseList = devMode && reordered ? reordered : achievements;

    const preFiltered = baseList.filter(a => respectsTagFilters(a));

    const matchingItems = preFiltered.filter(a => matchesQuery(a));
    if (!matchingItems || matchingItems.length === 0) return;

    const firstMatch = matchingItems[0];

    const targetIdxInPreFiltered = preFiltered.findIndex(a => a === firstMatch);

  setManualSearch(rawQuery);
    setSearchJumpPending(true);
    setVisibleCount(0);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const countToShow = Math.max(20, matchingItems.length);
      setVisibleCount(prev => Math.max(prev, countToShow));

      if (devMode) {
        setScrollToIdx(targetIdxInPreFiltered);
        setHighlightedIdx(targetIdxInPreFiltered);
      } else {

        const visibleFiltered = achievements.filter(a => {
          if (manualSearch || debouncedSearch) {
            const s = manualSearch ? manualSearch : debouncedSearch;
            const sLower = (s || '').trim().toLowerCase();
            if (sLower) {
              if (typeof a.name !== 'string' || !a.name.toLowerCase().includes(sLower)) return false;
            }
          }
          const tags = (a.tags || []).map(t => t.toUpperCase());
          if (filterTags.include.length && !filterTags.include.every(tag => tags.includes(tag.toUpperCase()))) return false;
          if (filterTags.exclude.length && filterTags.exclude.some(tag => tags.includes(tag.toUpperCase()))) return false;
          return true;
        });

        const finalIdx = visibleFiltered.findIndex(a => a === firstMatch);
        const idxToUse = finalIdx === -1 ? 0 : finalIdx;
        setScrollToIdx(idxToUse);
        if (finalIdx === -1) {
          setNoMatchMessage('No matching achievement is currently visible with the active filters.');
          window.setTimeout(() => setNoMatchMessage(''), 3000);
        } else {
          setHighlightedIdx(idxToUse);
        }
      }
    }));

    if (document && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  }
  const [filterTags, setFilterTags] = useState({ include: [], exclude: [] });
  const [allTags, setAllTags] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const mobileBtnRef = useRef();
  const [isPending, startTransition] = typeof useTransition === 'function' ? useTransition() : [false, fn => fn()];
  const { dateFormat, setDateFormat } = useDateFormat();
  const [showSettings, setShowSettings] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [sortKey, setSortKey] = useState(() => {
    try { return typeof window !== 'undefined' ? (localStorage.getItem('sortKey') || '') : ''; } catch (e) { return ''; }
  });
  const [sortDir, setSortDir] = useState(() => {
    try { return typeof window !== 'undefined' ? localStorage.getItem('sortDir') || 'asc' : 'asc'; } catch (e) { return 'asc'; }
  });

  const compareByKey = useCallback((a, b, key) => {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    const getVal = item => {
      if (!item) return '';
      if (key === 'name') return (item.name || '').toString().toLowerCase();
      if (key === 'length') return Number(item.length) || 0;
      if (key === 'levelID') return Number(item.levelID) || 0;
      if (key === 'date') {
        if (!item.date) return 0;

        try {
          const s = String(item.date).trim();

          if (/^\d{4}-(?:\d{2}|\?\?)-(?:\d{2}|\?\?)$/.test(s)) {
            const normalized = s.replace(/\?\?/g, '01');
            const d = new Date(normalized + 'T00:00:00Z');
            const t = d.getTime();
            return Number.isFinite(t) ? t : Infinity;
          }

          const parsed = new Date(s);
          if (Number.isFinite(parsed.getTime())) {
            const utcMidnight = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
            return utcMidnight;
          }
          const m = s.match(/\bt=(\d+)\b/);
          if (m) {
            const secs = Number(m[1]) || 0;
            return secs * 1000;
          }
          return Infinity;
        } catch (e) {
          return Infinity;
        }
      }

      return (item[key] || '').toString().toLowerCase();
    };
    const va = getVal(a);
    const vb = getVal(b);
    if (typeof va === 'number' && typeof vb === 'number') return va - vb;
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  }, []);

  const [randomOrderMap, setRandomOrderMap] = useState({});

  const [reordered, setReordered] = useState(null);
  const [bgImage, setBgImage] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [duplicateThumbKeys, setDuplicateThumbKeys] = useState(new Set());
  const [newForm, setNewForm] = useState({
    name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: []
  });
  const [newFormTags, setNewFormTags] = useState([]);
  const [newFormCustomTags, setNewFormCustomTags] = useState('');
  const [insertIdx, setInsertIdx] = useState(null);
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editFormTags, setEditFormTags] = useState([]);
  const [editFormCustomTags, setEditFormCustomTags] = useState('');
  const achievementRefs = useRef([]);

  function handleMoveAchievementUp(idx) {
    setReordered(prev => {
      if (!prev || idx <= 0) return prev;
      const arr = [...prev];
      const temp = arr[idx - 1];
      arr[idx - 1] = arr[idx];
      arr[idx] = temp;
      arr.forEach((a, i) => { a.rank = i + 1; });
      return arr;
    });
  }

  function handleMoveAchievementDown(idx) {
    setReordered(prev => {
      if (!prev || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      const temp = arr[idx + 1];
      arr[idx + 1] = arr[idx];
      arr[idx] = temp;
      arr.forEach((a, i) => { a.rank = i + 1; });
      return arr;
    });
  }

  function handleCheckDuplicateThumbnails() {
    const items = devMode && reordered ? reordered : achievements;
    const map = new Map();
    items.forEach((a, i) => {
      const thumb = (a && a.thumbnail) ? a.thumbnail : (a && a.levelID) ? `https://tjcsucht.net/levelthumbs/${a.levelID}.png` : '';
      const key = String(thumb || '').trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    const dupKeys = new Set();
    map.forEach((count, key) => { if (count > 1) dupKeys.add(key); });
    setDuplicateThumbKeys(dupKeys);
  }
  const [scrollToIdx, setScrollToIdx] = useState(null);
  function handleEditAchievement(idx) {
    if (!reordered || !reordered[idx]) return;
    const a = reordered[idx];
    setEditIdx(idx);
    setEditForm({
      ...a,
      version: Number(a.version) || 2,
      levelID: Number(a.levelID) || 0,
      length: Number(a.length) || 0
    });
    setEditFormTags(Array.isArray(a.tags) ? [...a.tags] : []);
    setEditFormCustomTags('');
    setShowNewForm(false);
  }

  function handleEditFormChange(e) {
    const { name, value } = e.target;
    let newVal;
    if (name === 'id') {

      newVal = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
    } else {
      newVal = (name === 'video' || name === 'showcaseVideo')
        ? normalizeYoutubeUrl(value)
        : (['version', 'levelID', 'length'].includes(name) ? Number(value) : value);
    }
    setEditForm(f => ({
      ...f,
      [name]: newVal
    }));
  }

  function handleEditFormTagClick(tag) {
    setEditFormTags(tags => tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  }

  function handleEditFormCustomTagsChange(e) {
    setEditFormCustomTags(e.target.value);
  }

  function handleEditFormSave() {
    const entry = {};
    Object.entries(editForm).forEach(([k, v]) => {
      if (k === 'levelID') {
        const num = Number(v);
        if (!isNaN(num) && num > 0) {
          entry[k] = num;
        }
        return;
      }
      if (typeof v === 'string') {
        if (v.trim() !== '') entry[k] = v.trim();
      } else if (v !== undefined && v !== null && v !== '') {
        entry[k] = v;
      }
    });
    let tags = [...editFormTags];
    if (typeof editFormCustomTags === 'string' && editFormCustomTags.trim()) {
      editFormCustomTags.split(',').map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).forEach(t => {
        if (!tags.includes(t)) tags.push(t);
      });
    }
    if (tags.length > 0) entry.tags = tags;

    if (entry.video) entry.video = normalizeYoutubeUrl(entry.video);
    if (entry.showcaseVideo) entry.showcaseVideo = normalizeYoutubeUrl(entry.showcaseVideo);

    setReordered(prev => {
      if (!prev) return prev;
      const arr = [...prev];
      const [removed] = arr.splice(editIdx, 1);
      const updated = { ...removed, ...entry };

      arr.splice(editIdx, 0, updated);
      return arr;
    });
    setEditIdx(null);
    setEditForm(null);
    setEditFormTags([]);
    setEditFormCustomTags('');
  }

  function handleEditFormCancel() {
    setEditIdx(null);
    setEditForm(null);
    setEditFormTags([]);
    setEditFormCustomTags('');
  }

  useEffect(() => {
    const file = dataUrl;
    fetch(file)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.achievements || []);
        const valid = list.filter(a => a && typeof a.name === 'string' && a.name && a.id);
        const withRank = valid.map((a, i) => ({ ...a, rank: i + 1 }));
        setAchievements(withRank);
        const tags = new Set();
        withRank.forEach(a => (a.tags || []).forEach(t => tags.add(t)));
        setAllTags(Array.from(tags));
      }).catch(e => {

        setAchievements([]);
      });
  }, [dataUrl]);

  useEffect(() => {
    try {
      const srcList = achievements || [];
      if (!srcList || !srcList.length) {
        setBgImage(null);
        return;
      }

      const top = srcList.find(a => Number(a.rank) === 1) || srcList[0];
      if (!top) {
        setBgImage(null);
        return;
      }
      const thumb = (top.thumbnail && String(top.thumbnail).trim()) ? top.thumbnail : (top.levelID ? `https://tjcsucht.net/levelthumbs/${top.levelID}.png` : null);
      setBgImage(thumb || null);
    } catch (e) {
      setBgImage(null);
    }
  }, [achievements, usePlatformers]);

  const router = useRouter();

  useEffect(() => {
    if (!router || !router.isReady) return;
    try {
      const hasDev = router.query && (router.query.dev === '1' || router.query.dev === 'true' || router.query.dev !== undefined);
      if (hasDev && achievements && achievements.length && !devMode) {
        setDevMode(true);
        setReordered(achievements.map(a => ({ ...a })));
      }
    } catch (e) {
    }
  }, [router, router && router.isReady, router && router.query, achievements]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        setDevMode(v => {
          const next = !v;
          if (!next) setReordered(null);
          else setReordered(achievements);
          return next;
        });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [achievements]);

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
    const s = manualSearch ? manualSearch : debouncedSearch;
    return (s || '').trim().toLowerCase();
  }, [manualSearch, debouncedSearch]);

  const filterFn = useCallback(
    a => {
      if (searchLower) {
        if (typeof a.name !== 'string') return false;
        if (!a.name.toLowerCase().includes(searchLower)) return false;
      }
      const tags = (a.tags || []).map(t => t.toUpperCase());
      if (filterTags.include.length && !filterTags.include.every(tag => tags.includes(tag.toUpperCase()))) return false;
      if (filterTags.exclude.length && filterTags.exclude.some(tag => tags.includes(tag.toUpperCase()))) return false;
      return true;
    },
    [searchLower, filterTags]
  );

  const filtered = useMemo(() => {
    let base = achievements.filter(filterFn);
    if (!sortKey) return base;
    if (sortKey === 'levelID') {
      base = base.filter(a => {
        const num = Number(a && a.levelID);
        return !isNaN(num) && num > 0;
      });
      const copy = [...base];
      copy.sort((x, y) => compareByKey(x, y, 'levelID'));
      if (sortDir === 'desc') copy.reverse();
      return copy;
    }
    if (sortKey === 'random') {
      const copy = [...base];
      const getKey = item => (item && item.id) ? String(item.id) : `__idx_${base.indexOf(item)}`;
      copy.sort((x, y) => ( (randomOrderMap[getKey(x)] || 0) - (randomOrderMap[getKey(y)] || 0) ));
      return copy;
    }
    const copy = [...base];
    copy.sort((x, y) => compareByKey(x, y, sortKey));
    if (sortDir === 'desc') copy.reverse();
    return copy;
  }, [achievements, filterFn, sortKey, sortDir, compareByKey, randomOrderMap]);

  useEffect(() => {
    let pref = 100;
    if (searchJumpPending) return;
    try {
      if (typeof window !== 'undefined') {
        const v = localStorage.getItem('itemsPerPage');
        pref = v === 'all' ? 'all' : (v ? Number(v) || 100 : 100);
      }
    } catch (e) { pref = 100; }

    if (pref === 'all') setVisibleCount(filtered.length);
    else setVisibleCount(Math.min(pref, filtered.length));
  }, [filtered]);

  const baseDev = devMode && reordered ? reordered : achievements;

  const devAchievements = useMemo(() => {
    if (!baseDev) return baseDev;
    if (!sortKey) return baseDev;
    if (sortKey === 'levelID') {
      const onlyWithLevel = baseDev.filter(a => {
        const num = Number(a && a.levelID);
        return !isNaN(num) && num > 0;
      });
      const copy = [...onlyWithLevel];
      copy.sort((x, y) => compareByKey(x, y, 'levelID'));
      if (sortDir === 'desc') copy.reverse();
      return copy;
    }
    if (sortKey === 'random') {
      const copy = [...baseDev];
      const getKey = item => (item && item.id) ? String(item.id) : `__idx_${baseDev.indexOf(item)}`;
      copy.sort((x, y) => ( (randomOrderMap[getKey(x)] || 0) - (randomOrderMap[getKey(y)] || 0) ));
      if (sortDir === 'desc') copy.reverse();
      return copy;
    }
    const copy = [...baseDev];
    copy.sort((x, y) => compareByKey(x, y, sortKey));
    if (sortDir === 'desc') copy.reverse();
    return copy;
  }, [baseDev, sortKey, sortDir, compareByKey, randomOrderMap]);

  useEffect(() => {
    const items = (reordered && Array.isArray(reordered) && reordered.length) ? reordered : achievements;
    const keys = (items || []).map((a, i) => (a && a.id) ? String(a.id) : `__idx_${i}`);

    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = keys[i];
      keys[i] = keys[j];
      keys[j] = t;
    }
    const map = {};
    keys.forEach((k, i) => { map[k] = i; });
    setRandomOrderMap(map);
  }, [achievements, reordered]);

  function handleMobileToggle() {
    setShowMobileFilters(v => !v);
  }

  function handleNewFormChange(e) {
    const { name, value } = e.target;
    let newVal;
    if (name === 'id') {

      newVal = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
    } else {
      newVal = (name === 'video' || name === 'showcaseVideo')
        ? normalizeYoutubeUrl(value)
        : (['version', 'levelID', 'length'].includes(name) ? Number(value) : value);
    }
    setNewForm(f => ({
      ...f,
      [name]: newVal
    }));
  }
  function handleNewFormTagClick(tag) {
    setNewFormTags(tags => tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  }
  function handleNewFormCustomTagsChange(e) {
    setNewFormCustomTags(e.target.value);
  }
  function handleNewFormAdd() {
    let tags = [...newFormTags];
    if (typeof newFormCustomTags === 'string' && newFormCustomTags.trim()) {
      newFormCustomTags.split(',').map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).forEach(t => {
        if (!tags.includes(t)) tags.push(t);
      });
    }
    const entry = {};
    Object.entries(newForm).forEach(([k, v]) => {
      if (k === 'levelID') {
        const num = Number(v);
        if (!isNaN(num) && num > 0) {
          entry[k] = num;
        }
        return;
      }
      if (typeof v === 'string') {
        if (v.trim() !== '') entry[k] = v.trim();
      } else if (v !== undefined && v !== null && v !== '') {
        entry[k] = v;
      }
    });
    if (tags.length > 0) entry.tags = tags;
    if (entry.video) entry.video = normalizeYoutubeUrl(entry.video);
    if (entry.showcaseVideo) entry.showcaseVideo = normalizeYoutubeUrl(entry.showcaseVideo);
    setReordered(prev => {
      let newArr;
      if (!prev) {
        setScrollToIdx(0);
        newArr = [entry];
      } else if (insertIdx === null || insertIdx < 0 || insertIdx > prev.length - 1) {
        setScrollToIdx(prev.length);
        newArr = [...prev, entry];
      } else {
        newArr = [...prev];
        newArr.splice(insertIdx + 1, 0, entry);
        setScrollToIdx(insertIdx + 1);
      }

      return newArr;
    });
    setShowNewForm(false);
    setNewForm({ name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: [] });
    setNewFormTags([]);
    setNewFormCustomTags('');
    setInsertIdx(null);
  }
  function handleNewFormCancel() {
    setShowNewForm(false);
    setNewForm({ name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: [] });
    setNewFormTags([]);
    setNewFormCustomTags('');
  }
  const newFormPreview = useMemo(() => {
    let tags = [...newFormTags];
    if (typeof newFormCustomTags === 'string' && newFormCustomTags.trim()) {
      newFormCustomTags.split(',').map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).forEach(t => {
        if (!tags.includes(t)) tags.push(t);
      });
    }
    const entry = {};
    Object.entries(newForm).forEach(([k, v]) => {
      if (k === 'levelID') {
        const num = Number(v);
        if (!isNaN(num) && num > 0) entry[k] = num;
        return;
      }
      if (typeof v === 'string') {
        if (v.trim() !== '') entry[k] = v.trim();
      } else if (v !== undefined && v !== null && v !== '') {
        entry[k] = v;
      }
    });
    if (tags.length > 0) entry.tags = tags;
    return entry;
  }, [newForm, newFormTags, newFormCustomTags]);

  function handleCopyJson() {
    if (!reordered) return;
  const json = JSON.stringify(reordered.map(r => ({ ...r })), null, 2);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json);
      alert(`Copied new ${usePlatformers ? 'platformers.json' : 'pending.json'} to clipboard!`);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert(`Copied new ${usePlatformers ? 'platformers.json' : 'pending.json'} to clipboard!`);
    }
  }

  const { getMostVisibleIdx } = useScrollPersistence({
    storageKey: `thal_scroll_index_pending`,
    items: achievements,
    devMode,
    listRef,
    itemRefs: achievementRefs,
    setScrollToIdx,
    setHighlightedIdx,
  });
  function handleShowNewForm() {
    if (showNewForm) {
      setShowNewForm(false);
      setInsertIdx(null);
      setNewForm({ name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: [] });
      setNewFormTags([]);
      setNewFormCustomTags('');
      return;
    }
    setInsertIdx(getMostVisibleIdx());
    setShowNewForm(true);
  }

  useEffect(() => {
    if (scrollToIdx !== null && achievementRefs.current[scrollToIdx]) {
      achievementRefs.current[scrollToIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      setScrollToIdx(null);
      if (searchJumpPending) setSearchJumpPending(false);
    }
  }, [scrollToIdx, devAchievements]);

  useEffect(() => {
    if (highlightedIdx === null) return;
    const id = window.setTimeout(() => setHighlightedIdx(null), 3000);
    return () => window.clearTimeout(id);
  }, [highlightedIdx]);

  useEffect(() => {
    if (scrollToIdx === null) return;
    if (devMode) return;
    try {
      const idx = Math.max(0, Math.min(scrollToIdx, filtered.length - 1));
      if (listRef && listRef.current && typeof listRef.current.scrollToItem === 'function') {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          try {
            if (typeof listRef.current.scrollToItem === 'function') {
              listRef.current.scrollToItem(idx, 'center');
            } else if (typeof listRef.current.scrollTo === 'function') {
              const offset = idx * 150;
              listRef.current.scrollTo(offset);
            }
            if (searchJumpPending) setSearchJumpPending(false);
          } catch (e) { }
        }));
      } else if (achievementRefs.current && achievementRefs.current[idx]) {
        achievementRefs.current[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (searchJumpPending) setSearchJumpPending(false);
      }
    } catch (e) {
    }
    setScrollToIdx(null);
  }, [scrollToIdx, filtered, devMode]);

  function handleRemoveAchievement(idx) {
    setReordered(prev => {
      if (!prev) return prev;
      const arr = [...prev];
      arr.splice(idx, 1);
      return arr;
    });
  }

  function handleDuplicateAchievement(idx) {
    setReordered(prev => {
      if (!prev) return prev;
      const arr = [...prev];
      const copy = { ...arr[idx], id: arr[idx].id + '-copy' };
      arr.splice(idx + 1, 0, copy);
      setScrollToIdx(idx + 1);
      return arr;
    });
  }

  return (
    <>
      <Head>
        <title>The Hardest Achievements List</title>
        <meta charSet="UTF-8" />
      </Head>
      <Background bgImage={null} />
      <main className="main-content achievements-main">
        <div className="no-achievements">SharedList loaded. Provide the rest of the original list.js JSX here.</div>
      </main>
    </>
  );
}

const TagFilterPills = React.memo(TagFilterPillsInner, (prev, next) => {
  return prev.allTags === next.allTags && prev.filterTags === next.filterTags && prev.isMobile === next.isMobile && prev.show === next.show;
});
