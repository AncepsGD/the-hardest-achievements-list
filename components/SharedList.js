import Head from 'next/head';
import React, { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
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

// Add timeline-specific helpers
function parseAsLocal(d) {
  if (!d) return null;
  const s = String(d).trim();
  // treat unknown parts as invalid for calculations
  if (s.includes('?')) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      // Use local parsing for YYYY-MM-DD
      return new Date(s.replace(/-/g, '/'));
    }
    return new Date(s);
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

// Timeline card (shows length, lasted # days, date)
function TimelineAchievementCardInner({ achievement, previousAchievement, onEdit, onHoverEnter, onHoverLeave, isHovered, devMode }) {
  const { dateFormat } = useDateFormat();
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
    // top item or missing previous -> days since achievement to today
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
        onMouseDown={handleClick}
        tabIndex={devMode ? -1 : 0}
        aria-disabled={devMode ? 'true' : undefined}
      >
        <div
          className={`achievement-item ${isHovered ? 'hovered' : ''}`}
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onMouseEnter={onHoverEnter}
          onMouseLeave={onHoverLeave}
        >
          <div className="rank-date-container">
            <div className="achievement-length">
              {achievement.length ? `${Math.floor(achievement.length / 60)}:${(achievement.length % 60).toString().padStart(2, '0')}` : 'N/A'}
            </div>
            <div className="lasted-days">{lastedLabel}</div>
            <div className="achievement-date"><strong>{achievement.date ? formatDate(achievement.date, dateFormat) : 'N/A'}</strong></div>
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
              <img src={sanitizeImageUrl(achievement.thumbnail) || (achievement.levelID ? `https://tjcsucht.net/levelthumbs/${achievement.levelID}.png` : '/assets/default-thumbnail.png')} alt={achievement.name} loading="lazy" />
            </div>
          </div>
          {/* Developer mode hover menu */}
          {onEdit && (
            <div className="hover-menu" style={{ display: isHovered ? 'flex' : 'none' }}>
              <button className="hover-menu-btn" onClick={onEdit} title="Edit achievement">
                <span className="bi bi-pencil" aria-hidden="true"></span>
              </button>
            </div>
          )}
        </div>
      </a>
    </Link>
  );
}

const TimelineAchievementCard = memo(TimelineAchievementCardInner, (prev, next) => prev.achievement === next.achievement && prev.devMode === next.devMode);

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
  storageKeySuffix = 'achievements',
  mode = ''
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

  const compareByKey = useCallback((a, b, key) => {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    const getVal = item => {
      if (!item) return '';
      if (key === 'name') return (item.name || '').toString().toLowerCase();
      if (key === 'length') return Number(item.length) || 0;
      if (key === 'levelID') return Number(item.levelID) || 0;
      if (key === 'rank') return Number(item.rank) || 0;
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
    let file = dataUrl;
    if (usePlatformers) {
      if (dataFileName === 'achievements.json' || dataUrl.endsWith('/achievements.json')) file = '/platformers.json';
      else if (dataFileName === 'timeline.json' || dataUrl.endsWith('/timeline.json')) file = '/platformertimeline.json';
      else if (dataFileName === 'pending.json' || dataUrl.endsWith('/pending.json')) file = '/platformers.json';
    }
    fetch(file)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.achievements || []);
        const valid = list.filter(a => a && typeof a.name === 'string' && a.name && a.id);
        if (dataFileName === 'pending.json') {
          setAchievements(valid);
        } else {
          const withRank = valid.map((a, i) => ({ ...a, rank: i + 1 }));
          setAchievements(withRank);
        }
        const tags = new Set();
        valid.forEach(a => (a.tags || []).forEach(t => tags.add(t)));
        setAllTags(Array.from(tags));
      }).catch(e => {
        setAchievements([]);
        setAllTags([]);
      });
  }, [dataUrl, dataFileName, usePlatformers]);

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

  const filterTagsUppercase = useMemo(() => ({
    include: filterTags.include.map(t => t.toUpperCase()),
    exclude: filterTags.exclude.map(t => t.toUpperCase())
  }), [filterTags]);

  const filterFn = useCallback(
    a => {
      if (searchLower) {
        if (typeof a.name !== 'string') return false;
        if (!a.name.toLowerCase().includes(searchLower)) return false;
      }
      const tags = (a.tags || []).map(t => t.toUpperCase());
      if (filterTagsUppercase.include.length && !filterTagsUppercase.include.every(tag => tags.includes(tag))) return false;
      if (filterTagsUppercase.exclude.length && filterTagsUppercase.exclude.some(tag => tags.includes(tag))) return false;
      return true;
    },
    [searchLower, filterTagsUppercase]
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

  const baseDev = devMode && reordered ? reordered : achievements;

  const devAchievements = useMemo(() => {
    if (!baseDev) return baseDev;
    if (!sortKey) return baseDev;
    
    const performSort = (items) => {
      if (sortKey === 'levelID') {
        const filtered = items.filter(a => {
          const num = Number(a && a.levelID);
          return !isNaN(num) && num > 0;
        });
        const copy = [...filtered];
        copy.sort((x, y) => compareByKey(x, y, 'levelID'));
        if (sortDir === 'desc') copy.reverse();
        return copy;
      }
      if (sortKey === 'random') {
        const copy = [...items];
        const getKey = item => (item && item.id) ? String(item.id) : `__idx_${items.indexOf(item)}`;
        copy.sort((x, y) => ( (randomOrderMap[getKey(x)] || 0) - (randomOrderMap[getKey(y)] || 0) ));
        if (sortDir === 'desc') copy.reverse();
        return copy;
      }
      const copy = [...items];
      copy.sort((x, y) => compareByKey(x, y, sortKey));
      if (sortDir === 'desc') copy.reverse();
      return copy;
    };
    
    return performSort(baseDev);
  }, [baseDev, sortKey, sortDir, compareByKey, randomOrderMap]);

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
      if (filterTagsUppercase.include.length && !filterTagsUppercase.include.every(tag => tags.includes(tag))) return false;
      if (filterTagsUppercase.exclude.length && filterTagsUppercase.exclude.some(tag => tags.includes(tag))) return false;
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
          if (filterTagsUppercase.include.length && !filterTagsUppercase.include.every(tag => tags.includes(tag))) return false;
          if (filterTagsUppercase.exclude.length && filterTagsUppercase.exclude.some(tag => tags.includes(tag))) return false;
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
  const isPending = false;
  const { dateFormat, setDateFormat } = useDateFormat();
  const [showSettings, setShowSettings] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [sortKey, setSortKey] = useState(() => {
    try { return typeof window !== 'undefined' ? (localStorage.getItem('sortKey') || 'rank') : 'rank'; } catch (e) { return 'rank'; }
  });
  const [sortDir, setSortDir] = useState(() => {
    try { return typeof window !== 'undefined' ? localStorage.getItem('sortDir') || 'asc' : 'asc'; } catch (e) { return 'asc'; }
  });

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
    const filename = usePlatformers
      ? (dataFileName === 'timeline.json' ? 'platformertimeline.json' : (dataFileName === 'achievements.json' ? 'platformers.json' : dataFileName))
      : dataFileName;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json);
      alert(`Copied new ${filename} to clipboard!`);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert(`Copied new ${filename} to clipboard!`);
    }
  }

  const { getMostVisibleIdx } = useScrollPersistence({
    storageKey: `thal_scroll_index_${storageKeySuffix}`,
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
              <div className="search-bar" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
                <input
                  type="text"
                  placeholder="Search achievements..."
                  value={search}
                  onChange={e => { setManualSearch(''); setSearch(e.target.value); }}
                  onKeyDown={handleSearchKeyDown}
                  aria-label="Search achievements"
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <label className="pill-toggle" data-variant="platformer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--muted, #DFE3F5)', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={usePlatformers}
                    onChange={e => {
                      const next = !!e.target.checked;
                      setUsePlatformers(next);
                      try { localStorage.setItem('usePlatformers', next ? '1' : '0'); } catch (err) {}
                    }}
                  />
                  <span
                    className="track"
                    role="switch"
                    aria-checked={usePlatformers}
                    tabIndex={0}
                  >
                    <span className="inner-label label-left">Platformer</span>
                    <span className="thumb" aria-hidden="true" />
                    <span className="inner-label label-right">Classic</span>
                  </span>
                </label>
              </div>
              <div className="tag-filter-pills-container" style={{ width: '100%' }}>
                <TagFilterPills
                  allTags={allTags}
                  filterTags={filterTags}
                  setFilterTags={setFilterTags}
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
            <div className="search-bar" style={{ width: '100%', maxWidth: 400, marginLeft: 'auto' }}>
              <input
                type="text"
                placeholder="Search achievements..."
                value={search}
                onChange={e => { setManualSearch(''); setSearch(e.target.value); }}
                onKeyDown={handleSearchKeyDown}
                aria-label="Search achievements"
                className="search-input"
                style={{ width: '100%' }}
              />
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
                    try { localStorage.setItem('sortKey', v); } catch (err) {}
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
                    try { localStorage.setItem('sortDir', next); } catch (err) {}
                  }}
                  style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--primary-accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {sortDir === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              <label className="pill-toggle" data-variant="platformer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--muted, #DFE3F5)', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={usePlatformers}
                  onChange={e => {
                    const next = !!e.target.checked;
                    setUsePlatformers(next);
                    try { localStorage.setItem('usePlatformers', next ? '1' : '0'); } catch (err) {}
                  }}
                />
                <span
                  className="track"
                  role="switch"
                  aria-checked={usePlatformers}
                  tabIndex={0}
                >
                  <span className="inner-label label-left">Platformer</span>
                  <span className="thumb" aria-hidden="true" />
                  <span className="inner-label label-right">Classic</span>
                </span>
              </label>
            </div>
          )}
        </div>
        {!isMobile && (
          <div className="tag-filter-pills-container">
            <TagFilterPills
              allTags={allTags}
              filterTags={filterTags}
              setFilterTags={setFilterTags}
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
        <div
          id="achievements-search-index"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: -9999,
            top: 'auto',
            width: 1,
            height: 1,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap'
          }}
        >
          {(devMode && reordered ? reordered : achievements).map((a, i) => {
            const parts = [];
            if (a && a.name) parts.push(a.name);
            if (a && a.player) parts.push(a.player);
            if (a && a.id) parts.push(String(a.id));
            if (a && a.levelID) parts.push(String(a.levelID));
            if (a && a.submitter) parts.push(a.submitter);
            if (a && Array.isArray(a.tags) && a.tags.length) parts.push(a.tags.join(', '));
            return (
              <span key={a && a.id ? a.id : `s-${i}`}>
                {parts.join(' \u2014 ')}
              </span>
            );
          })}
        </div>
        <section className="achievements achievements-section">
          <DevModePanel
            devMode={devMode}
            handleCheckDuplicateThumbnails={handleCheckDuplicateThumbnails}
            editIdx={editIdx}
            editForm={editForm}
            editFormTags={editFormTags}
            editFormCustomTags={editFormCustomTags}
            AVAILABLE_TAGS={AVAILABLE_TAGS}
            handleEditFormChange={handleEditFormChange}
            handleEditFormTagClick={handleEditFormTagClick}
            handleEditFormCustomTagsChange={handleEditFormCustomTagsChange}
            handleEditFormSave={handleEditFormSave}
            handleEditFormCancel={handleEditFormCancel}
            showNewForm={showNewForm}
            newForm={newForm}
            newFormTags={newFormTags}
            newFormCustomTags={newFormCustomTags}
            handleNewFormChange={handleNewFormChange}
            handleNewFormTagClick={handleNewFormTagClick}
            handleNewFormCustomTagsChange={handleNewFormCustomTagsChange}
            handleNewFormAdd={handleNewFormAdd}
            handleNewFormCancel={handleNewFormCancel}
            handleCopyJson={handleCopyJson}
            handleShowNewForm={handleShowNewForm}
            newFormPreview={newFormPreview}
            onImportAchievementsJson={json => {
              let imported = Array.isArray(json) ? json : (json.achievements || []);
              if (!Array.isArray(imported)) {
                alert(`Invalid ${usePlatformers ? 'platformers.json' : dataFileName} format.`);
                return;
              }
              imported = imported.map((a, i) => ({ ...a, rank: i + 1 }));
              try {
                const idx = typeof getMostVisibleIdx === 'function' ? getMostVisibleIdx() : null;
                setReordered(imported);
                setDevMode(true);
                if (idx !== null && typeof setScrollToIdx === 'function') {
                  requestAnimationFrame(() => requestAnimationFrame(() => setScrollToIdx(idx)));
                }
              } catch (e) {
                setReordered(imported);
                setDevMode(true);
              }
              alert(`Imported ${usePlatformers ? 'platformers.json' : dataFileName}!`);
            }}
            dataFileName={usePlatformers ? (dataFileName.includes('timeline') ? 'platformertimeline.json' : 'platformers.json') : dataFileName}
          />
          {isPending ? (
            <div className="no-achievements">Loading...</div>
          ) : (devMode ? (
            devAchievements.map((a, i) => (
              <div
                key={a.id || i}
                data-index={i}
                ref={el => {
                  achievementRefs.current[i] = el;
                }}
                className={(() => {
                  const thumb = (a && a.thumbnail) ? a.thumbnail : (a && a.levelID) ? `https://levelthumbs.prevter.me/thumbnail/${a.levelID}` : '';
                  return duplicateThumbKeys.has((thumb || '').trim()) ? 'duplicate-thumb-item' : '';
                })()}
                style={{
                  border: '1px solid #333',
                  marginBottom: 8,
                  background: '#181818',
                  borderRadius: 8,
                  position: 'relative'
                }}
                onClick={() => {
                  if (showNewForm && scrollToIdx === i) setShowNewForm(false);
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(v => v === i ? null : v)}
              >
                {(hoveredIdx === i) && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    gap: 32,
                    zIndex: 3,
                    background: 'var(--secondary-bg, #232323)',
                    borderRadius: '1.5rem',
                    padding: '22px 40px',
                    boxShadow: '0 4px 24px #000b',
                    alignItems: 'center',
                    border: '2px solid var(--primary-accent, #e67e22)',
                    transition: 'background 0.2s, border 0.2s',
                  }}>
                    <button
                      title="Move Up"
                      style={{
                        background: 'var(--primary-accent, #e67e22)',
                        border: 'none',
                        color: '#fff',
                        fontSize: 36,
                        cursor: 'pointer',
                        opacity: 1,
                        borderRadius: '50%',
                        width: 48,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px #0006',
                        transition: 'background 0.15s, transform 0.1s',
                        outline: 'none',
                        marginRight: 8,
                      }}
                      disabled={i === 0}
                      onClick={e => { e.stopPropagation(); handleMoveAchievementUp(i); }}
                    >▲</button>
                    <button
                      title="Move Down"
                      style={{
                        background: 'var(--primary-accent, #e67e22)',
                        border: 'none',
                        color: '#fff',
                        fontSize: 36,
                        cursor: 'pointer',
                        opacity: 1,
                        borderRadius: '50%',
                        width: 48,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px #0006',
                        transition: 'background 0.15s, transform 0.1s',
                        outline: 'none',
                        marginRight: 8,
                      }}
                      disabled={i === devAchievements.length - 1}
                      onClick={e => { e.stopPropagation(); handleMoveAchievementDown(i); }}
                    >▼</button>
                    <button
                      title="Edit"
                      style={{
                        background: 'var(--info, #2980b9)',
                        border: 'none',
                        color: '#fff',
                        fontSize: 44,
                        cursor: 'pointer',
                        opacity: 1,
                        borderRadius: '50%',
                        width: 64,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px #0006',
                        transition: 'background 0.15s, transform 0.1s',
                        outline: 'none',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--info-hover, #3498db)'}
                      onMouseOut={e => e.currentTarget.style.background = 'var(--info, #2980b9)'}
                      onClick={e => { e.stopPropagation(); handleEditAchievement(i); }}
                    >✏️</button>
                    <button
                      title="Duplicate"
                      style={{
                        background: 'var(--primary-accent, #e67e22)',
                        border: 'none',
                        color: '#fff',
                        fontSize: 44,
                        cursor: 'pointer',
                        opacity: 1,
                        borderRadius: '50%',
                        width: 64,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px #0006',
                        transition: 'background 0.15s, transform 0.1s',
                        outline: 'none',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--primary-accent-hover, #ff9800)'}
                      onMouseOut={e => e.currentTarget.style.background = 'var(--primary-accent, #e67e22)'}
                      onClick={e => { e.stopPropagation(); handleDuplicateAchievement(i); }}
                    >📄</button>
                    <button
                      title="Remove"
                      style={{
                        background: 'var(--danger, #c0392b)',
                        border: 'none',
                        color: '#fff',
                        fontSize: 44,
                        cursor: 'pointer',
                        opacity: 1,
                        borderRadius: '50%',
                        width: 64,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px #0006',
                        transition: 'background 0.15s, transform 0.1s',
                        outline: 'none',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--danger-hover, #e74c3c)'}
                      onMouseOut={e => e.currentTarget.style.background = 'var(--danger, #c0392b)'}
                      onClick={e => { e.stopPropagation(); handleRemoveAchievement(i); }}
                    >🗑️</button>
                  </div>
                )}
                <div style={{
                  opacity: hoveredIdx === i ? 0.3 : 1,
                  transition: 'opacity 0.2s',
                  position: 'relative',
                  zIndex: 1
                }} className={highlightedIdx === i ? 'search-highlight' : ''}>
                  { mode === 'timeline' ?
                    <TimelineAchievementCard achievement={a} previousAchievement={devAchievements[i - 1]} onEdit={() => handleEditAchievement(i)} isHovered={hoveredIdx === i} devMode={devMode} />
                    :
                    <AchievementCard achievement={a} devMode={devMode} />
                  }
                </div>
              </div>
            ))
          ) : (
            filtered.length === 0 ? (
              <div className="no-achievements">No achievements found.</div>
            ) : (
              <ListWindow
                ref={listRef}
                height={Math.min(720, (typeof window !== 'undefined' ? window.innerHeight - 200 : 720))}
                itemCount={Math.min(visibleCount, filtered.length)}
                itemSize={() => 150}
                width={'100%'}
                style={{ overflowX: 'hidden' }}
                onItemsRendered={({ visibleStopIndex }) => {
                  try {
                    const v = typeof window !== 'undefined' ? localStorage.getItem('itemsPerPage') : null;
                    const pageSize = v === 'all' ? 'all' : (v ? Number(v) || 100 : 100);
                    if (pageSize === 'all') return;
                    if (visibleStopIndex >= Math.min(visibleCount, filtered.length) - 5 && visibleCount < filtered.length) {
                      setVisibleCount(prev => Math.min(prev + (Number(pageSize) || 100), filtered.length));
                    }
                  } catch (err) {
                    if (visibleStopIndex >= Math.min(visibleCount, filtered.length) - 5 && visibleCount < filtered.length) {
                      setVisibleCount(prev => Math.min(prev + 100, filtered.length));
                    }
                  }
                }}
              >
                {({ index, style }) => {
                  const a = filtered[index];
                  const itemStyle = { ...style, padding: 8, boxSizing: 'border-box' };
                  const thumb = (a && a.thumbnail) ? a.thumbnail : (a && a.levelID) ? `https://levelthumbs.prevter.me/thumbnail/${a.levelID}` : '';
                  const isDup = duplicateThumbKeys.has((thumb || '').trim());
                  return (
                    <div data-index={index} style={itemStyle} key={a.id || index} className={`${isDup ? 'duplicate-thumb-item' : ''} ${highlightedIdx === index ? 'search-highlight' : ''}`}>
                      { mode === 'timeline' ?
                          <TimelineAchievementCard achievement={a} previousAchievement={index > 0 ? filtered[index - 1] : null} onEdit={null} isHovered={false} devMode={devMode} />
                        :
                          <AchievementCard achievement={a} devMode={devMode} />
                      }
                    </div>
                  );
                }}
              </ListWindow>
            )
          ))}
        </section>
      </main>
      <div aria-live="polite" aria-atomic="true" style={{position:'absolute', left:-9999, top:'auto', width:1, height:1, overflow:'hidden'}}>
        {noMatchMessage}
      </div>
    </>
  );
}

const TagFilterPills = React.memo(TagFilterPillsInner, (prev, next) => {
  return prev.allTags === next.allTags && prev.filterTags === next.filterTags && prev.isMobile === next.isMobile && prev.show === next.show;
});
