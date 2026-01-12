import Head from 'next/head';
import React, { useEffect, useState, useMemo, useRef, useCallback, useTransition, memo } from 'react';
import Fuse from 'fuse.js';
import { FixedSizeList as ListWindow } from 'react-window';
import Link from 'next/link';
import { useRouter } from 'next/router';

import Sidebar from '../components/Sidebar';
import Background from '../components/Background';
import { useDateFormat } from '../components/DateFormatContext';
import Tag, { TAG_PRIORITY_ORDER } from '../components/Tag';
import TierTag, { getTierByRank } from '../components/TierSystem';
import DevModePanel from '../components/DevModePanel';
import { EditIcon, UpIcon, CopyIcon, DownIcon, AddIcon, DeleteIcon } from './DevIcons';
import MobileSidebarOverlay from '../components/MobileSidebarOverlay';
import { useScrollPersistence } from '../hooks/useScrollPersistence';

function getAchievementContext(achievement, allAchievements, index) {
  const below = index > 0 ? allAchievements[index - 1]?.name : null;
  const above = index < allAchievements.length - 1 ? allAchievements[index + 1]?.name : null;
  return { below, above };
}

function formatChangelogEntry(change, achievements, mode, idIndexMap, contextMap) {
  const { type, achievement, oldAchievement, oldRank, newRank, removedDuplicates, readdedAchievements, oldIndex, newIndex } = change;

  if (!achievement) return '';

  const name = achievement.name || 'Unknown';
  const rank = achievement.rank || '?';
  const allAchievements = achievements || [];

  let newIdx = -1;
  if (idIndexMap && achievement && achievement.id && idIndexMap.has(achievement.id)) {
    newIdx = idIndexMap.get(achievement.id);
  } else {
    newIdx = allAchievements.findIndex(a => a.id === achievement.id);
  }
  let context = { below: null, above: null };
  try {
    if (contextMap && achievement && achievement.id && contextMap.has(achievement.id)) {
      context = contextMap.get(achievement.id);
    } else if (newIdx >= 0) {
      context = getAchievementContext(achievement, allAchievements, newIdx);
      if (contextMap && achievement && achievement.id) {
        try { contextMap.set(achievement.id, context); } catch (e) { }
      }
    }
  } catch (e) {
    context = newIdx >= 0 ? getAchievementContext(achievement, allAchievements, newIdx) : { below: null, above: null };
  }
  const showOnlyOneContext = mode === 'dev';

  let entry = '';
  switch (type) {
    case 'added':
      entry = `<:added:1458440716400459837> **${name}** added at #${rank}`;
      if (showOnlyOneContext) {
        if (context.below) entry += `\n> Below ${context.below}`;
      } else {
        if (context.below) entry += `\n> Below ${context.below}`;
        if (context.above) entry += `\n> Above ${context.above}`;
      }
      break;

    case 'removed':
      entry = `⛔ **${name}** removed from #${oldRank || rank}`;
      if (oldAchievement) {
        const oldContext = getAchievementContext(oldAchievement, achievements || [], oldIndex || 0);
        if (showOnlyOneContext) {
          if (oldContext.below) entry += `\n> Formerly below ${oldContext.below}`;
        } else {
          if (oldContext.below) entry += `\n> Formerly below ${oldContext.below}`;
          if (oldContext.above) entry += `\n> Formerly above ${oldContext.above}`;
        }
      }
      break;

    case 'movedUp':
      entry = `🔼 **${name}** moved up from #${oldRank} to #${rank}`;
      if (showOnlyOneContext) {
        if (context.below) entry += `\n> Now below ${context.below}`;
      } else {
        if (context.below) entry += `\n> Now below ${context.below}`;
        if (context.above) entry += `\n> Now above ${context.above}`;
      }
      break;

    case 'movedDown':
      entry = `🔽 **${name}** moved down from #${oldRank} to #${rank}`;
      if (showOnlyOneContext) {
        if (context.below) entry += `\n> Now below ${context.below}`;
      } else {
        if (context.below) entry += `\n> Now below ${context.below}`;
        if (context.above) entry += `\n> Now above ${context.above}`;
      }
      break;

    case 'swapped':
      {
        const a = achievement;
        const b = oldAchievement;
        const nameA = (a && a.name) ? a.name : 'Unknown';
        const nameB = (b && b.name) ? b.name : 'Unknown';
        const newA = (newRank != null) ? newRank : (a && a.rank) ? a.rank : '?';
        const newB = (change && change.newRankB != null) ? change.newRankB : (b && b.rank) ? b.rank : '?';
        entry = `:repeat: **${nameA}** swapped placement with **${nameB}**`;
        entry += `\n> Now ${nameA} is #${newA}`;
        entry += `\n> And ${nameB} is #${newB}`;
      }
      break;

    case 'renamed':
      entry = `⚪ ${oldAchievement?.name || 'Unknown'} updated to **${name}**`;
      break;

    case 'addedWithRemovals':
      entry = `<:updatedup:1375890567870812322> **${name}** added at #${rank}`;
      if (showOnlyOneContext) {
        if (context.below) entry += `\n> Now below ${context.below}`;
      } else {
        if (context.below) entry += `\n> Now below ${context.below}`;
        if (context.above) entry += `\n> Now above ${context.above}`;
      }
      if (removedDuplicates && removedDuplicates.length > 0) {
        entry += `\n>\n> Achievement(s) removed for redundancy:`;
        removedDuplicates.forEach(dup => {
          entry += `\n> ⛔ ${dup.name} (#${dup.rank})`;
        });
      }
      break;

    case 'removedWithReadds':
      entry = `<:updateddown:1375890556059783371> **${name}** removed from #${oldRank || rank}`;
      if (oldAchievement) {
        const oldContext = getAchievementContext(oldAchievement, achievements || [], oldIndex || 0);
        if (showOnlyOneContext) {
          if (oldContext.below) entry += `\n> Formerly below ${oldContext.below}`;
        } else {
          if (oldContext.below) entry += `\n> Formerly below ${oldContext.below}`;
          if (oldContext.above) entry += `\n> Formerly above ${oldContext.above}`;
        }
      }
      if (readdedAchievements && readdedAchievements.length > 0) {
        entry += `\n>\n> Achievement(s) re-added due to renewed relevance:`;
        readdedAchievements.forEach(re => {
          entry += `\n> <:added:1458440716400459837> ${re.name} (#${re.rank})`;
        });
      }
      break;

    case 'timelineAdded':
      entry = `<:timelineadd:1458442225351393307> **${name}** added to the Timeline at ${achievement.date || 'Unknown date'}`;
      break;

    case 'timelineRemoved':
      entry = `<:timelineremove:1375894648383606945> **${name}** removed from the Timeline at ${achievement.date || 'Unknown date'}`;
      break;
  }

  return entry;
}

const ID_INDEX_TTL_MS = 5 * 60 * 1000;
const _idIndexCache = new Map();

function formatDate(date, dateFormat) {
  if (!date) return 'N/A';
  function parseAsLocal(input) {
    if (input instanceof Date) return input;
    if (typeof input === 'number') return new Date(input);
    if (typeof input !== 'string') return new Date(input);

    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      return new Date(y, mo - 1, d);
    }

    return new Date(input);
  }

  const d = parseAsLocal(date);
  if (isNaN(d)) return 'N/A';
  const yy = String(d.getFullYear()).slice(-2);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  if (dateFormat === 'YYYY/MM/DD') return `${yyyy}/${mm}/${dd}`;
  if (dateFormat === 'MM/DD/YY') return `${mm}/${dd}/${yy}`;
  if (dateFormat === 'DD/MM/YY') return `${dd}/${mm}/${yy}`;
  try {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return `${yyyy}-${mm}-${dd}`;
  }
}

const AVAILABLE_TAGS = [
  "Level", "Challenge", "Platformer", "Verified", "Deathless", "Coin Route", "Low Hertz", "Mobile", "Speedhack",
  "Noclip", "Miscellaneous", "Progress", "Consistency", "Speedrun",
  "2P", "CBF", "Rated", "Formerly Rated", "Outdated Version", "Tentative"
];

function shouldShowTier(tier, mode, usePlatformers, showTiers) {
  return !!tier && !usePlatformers && showTiers === true;
}

const _enhanceCache = new Map();
let _enhanceCacheHits = 0;
let _enhanceCacheMisses = 0;
const _enhanceCacheWrites = new Map();
const _enhanceCacheHitCounts = new Map();

function getEnhanceCacheStats() {
  try { return { size: _enhanceCache.size, hits: _enhanceCacheHits, misses: _enhanceCacheMisses }; } catch (e) { return { size: 0, hits: 0, misses: 0 }; }
}

function getEnhanceCachePerIdStats() {
  try {
    const writes = Array.from(_enhanceCacheWrites.entries()).map(([id, count]) => ({ id, writes: count }));
    const hits = Array.from(_enhanceCacheHitCounts.entries()).map(([id, count]) => ({ id, hits: count }));
    return { writes, hits };
  } catch (e) { return { writes: [], hits: [] }; }
}

function validateEnhanceCache(opts = {}) {
  try {
    const { minHitRate = 0.5, maxWritesPerId = 1 } = opts || {};
    const s = getEnhanceCacheStats();
    const total = (s.hits || 0) + (s.misses || 0);
    const hitRate = total ? (s.hits / total) : 0;
    const unstable = [];
    _enhanceCacheWrites.forEach((count, id) => { if (count > maxWritesPerId) unstable.push({ id, writes: count }); });
    return { hitRate, hits: s.hits, misses: s.misses, unstable, healthy: hitRate >= minHitRate && unstable.length === 0 };
  } catch (e) { return { hitRate: 0, hits: 0, misses: 0, unstable: [], healthy: false }; }
}

function resetEnhanceCache() {
  try { _enhanceCache.clear(); _enhanceCacheHits = 0; _enhanceCacheMisses = 0; _enhanceCacheWrites.clear(); _enhanceCacheHitCounts.clear(); } catch (e) { }
}

const _pasteIndexCache = new Map();

function _makePasteSignature(items) {
  try {
    if (!Array.isArray(items)) return '';
    const parts = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const a = items[i] || {};
      if (a.id !== undefined && a.id !== null) parts[i] = `id:${String(a.id)}`;
      else if (a.levelID !== undefined && a.levelID !== null) parts[i] = `lvl:${String(a.levelID)}`;
      else if (a.name) parts[i] = `n:${String(a.name).slice(0, 60)}`;
      else parts[i] = `idx:${i}`;
    }
    return parts.join('|');
  } catch (e) {
    return '';
  }
}

export { getEnhanceCacheStats, resetEnhanceCache, getEnhanceCachePerIdStats, validateEnhanceCache };

function _makeEnhanceSignature(a) {
  try {
    const tags = Array.isArray(a.tags) ? a.tags.slice().sort().join('|') : '';
    const thumb = sanitizeImageUrl(a && a.thumbnail) || '';
    const lengthNum = Number(a.length) || 0;
    const version = a && a.version ? String(a.version) : '';
    const name = a && a.name ? String(a.name) : '';
    return `${tags}::${thumb}::${lengthNum}::${version}::${name}`;
  } catch (e) {
    return '';
  }
}

function normalizeForSearch(input) {
  if (!input || typeof input !== 'string') return '';
  let s = input.trim().toLowerCase();
  try {
    s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  } catch (e) { }
  s = s.replace(/[^a-z0-9]+/g, ' ');
  const alt = {
    'colour': 'color',
    'colours': 'colors',
    'favourite': 'favorite',
    'centre': 'center',
    'behaviour': 'behavior',
    'organisation': 'organization',
    'organisation': 'organization',
    'gaol': 'jail'
  };
  Object.keys(alt).forEach(k => {
    s = s.replace(new RegExp('\\b' + k + '\\b', 'g'), alt[k]);
  });
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function _tokensFromNormalized(normalized) {
  return String(normalized || '').split(' ').filter(Boolean);
}

function enhanceAchievement(a) {
  if (!a || typeof a !== 'object') return a;
  const id = a && a.id ? String(a.id) : null;
  const sig = _makeEnhanceSignature(a);
  if (id) {
    const cached = _enhanceCache.get(id);
    if (cached && cached.signature === sig) {
      _enhanceCacheHits++;
      try { _enhanceCacheHitCounts.set(id, (_enhanceCacheHitCounts.get(id) || 0) + 1); } catch (e) { }
      return cached.value;
    }
  }
  const base = { ...a };
  delete base._lengthStr; delete base._thumbnail; delete base._searchable; delete base._searchableNormalized; delete base._tagString;
  delete base.hasThumb; delete base.autoThumb;

  const tags = Array.isArray(base.tags) ? [...base.tags] : [];
  const sortedTags = tags.slice().sort((x, y) => (TAG_PRIORITY_ORDER.indexOf(String(x).toUpperCase()) - TAG_PRIORITY_ORDER.indexOf(String(y).toUpperCase())));
  const isPlatformer = tags.some(t => String(t).toLowerCase() === 'platformer');
  const lengthNum = Number(base.length) || 0;
  const lengthStr = (base.length || base.length === 0) ? `${Math.floor(lengthNum / 60)}:${String(lengthNum % 60).padStart(2, '0')}` : null;

  const thumb = sanitizeImageUrl(base && base.thumbnail) || (base && (base.levelID || base.levelID === 0) ? `https://levelthumbs.prevter.me/thumbnail/${base.levelID}` : null);
  const hasThumb = !!thumb;
  const autoThumb = !!(!base.thumbnail && (base.levelID || base.levelID === 0));

  const searchableParts = [];
  if (base && base.name) searchableParts.push(String(base.name));
  if (base && base.player) searchableParts.push(String(base.player));
  if (base && base.id) searchableParts.push(String(base.id));
  if (base && (base.levelID || base.levelID === 0)) searchableParts.push(String(base.levelID));
  const searchable = searchableParts.join(' ');
  const searchableNormalized = normalizeForSearch(searchable);

  const tagString = (Array.isArray(sortedTags) && sortedTags.length) ? sortedTags.join(' ') : ((Array.isArray(tags) && tags.length) ? tags.join(' ') : '');

  const enhanced = {
    ...base,
    _sortedTags: sortedTags,
    _isPlatformer: isPlatformer,
    _lengthStr: lengthStr,
    _thumbnail: thumb,
    _searchable: (searchable || '').toLowerCase(),
    _searchableNormalized: searchableNormalized,
    _tagString: tagString,
    hasThumb,
    autoThumb,
  };
  if (id) {
    try {
      _enhanceCache.set(id, { signature: sig, value: enhanced });
      _enhanceCacheMisses++;
      _enhanceCacheWrites.set(id, (_enhanceCacheWrites.get(id) || 0) + 1);
    } catch (e) { }
  } else {
    _enhanceCacheMisses++;
    if (process && process.env && process.env.NODE_ENV === 'development') {
      console.warn('enhanceAchievement: achievement has no `id` — caching disabled for this item', a && a.name);
    }
  }
  return enhanced;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}


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

function getThumbnailUrl(achievement, isMobile) {
  try {
    const idPart = (achievement && (achievement.id !== undefined && achievement.id !== null)) ? `id:${String(achievement.id)}`
      : (achievement && (achievement.levelID !== undefined && achievement.levelID !== null)) ? `level:${String(achievement.levelID)}`
        : (achievement && achievement.thumbnail) ? `thumb:${String(achievement.thumbnail)}`
          : 'default';
    const key = `${idPart}::${isMobile ? 'm' : 'd'}`;
    if (getThumbnailUrl._cache && getThumbnailUrl._cache.has(key)) return getThumbnailUrl._cache.get(key);

    let url = '/assets/default-thumbnail.png';
    if (achievement && achievement.thumbnail) {
      url = achievement.thumbnail;
    } else if (achievement && achievement.levelID) {
      const baseUrl = `https://levelthumbs.prevter.me/thumbnail/${achievement.levelID}`;
      url = isMobile ? `${baseUrl}/small` : baseUrl;
    }

    try {
      if (!getThumbnailUrl._cache) getThumbnailUrl._cache = new Map();
      getThumbnailUrl._cache.set(key, url);
    } catch (e) { }

    return url;
  } catch (e) {
    return '/assets/default-thumbnail.png';
  }
}

function TagFilterPillsInner({ allTags, filterTags, setFilterTags, isMobile, show, setShow }) {
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

}

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

function TimelineAchievementCardInner({ achievement, previousAchievement, onEdit, onHoverEnter, onHoverLeave, devMode, autoThumbAvailable, totalAchievements, achievements = [], showTiers = false, mode = '', usePlatformers = false, extraLists = {}, listType = 'main' }) {
  const { dateFormat } = useDateFormat();
  const tier = getTierByRank(achievement.rank, totalAchievements, achievements, { enable: showTiers === true, listType });
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

const AchievementCard = memo(function AchievementCard({ achievement, devMode, autoThumbAvailable, displayRank, showRank = true, totalAchievements, achievements = [], mode = '', usePlatformers = false, showTiers = false, extraLists = {}, listType = 'main', onEditHandler, onEditIdx, onHoverEnter, onHoverLeave }) {
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

export default function SharedList({
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
  const [visibleCount, setVisibleCount] = useState(100);
  const [searchJumpPending, setSearchJumpPending] = useState(false);
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
  function restoreScrollToIndex(index, prevScrollTop, prevScrollLeft, prevActive) {
    try {
      const listCur = listRef && listRef.current;
      if (listCur) {
        if (typeof listCur.scrollToItem === 'function' && typeof index === 'number') {
          try { listCur.scrollToItem(Math.max(0, index), 'center'); if (prevActive && typeof prevActive.focus === 'function') prevActive.focus(); return; } catch (e) { }
        }
        if (typeof listCur.scrollTo === 'function' && typeof index === 'number') {
          try {
            const offset = index * 150;
            listCur.scrollTo(offset);
            if (prevActive && typeof prevActive.focus === 'function') prevActive.focus();
            return;
          } catch (e) { }
        }
      }
    } catch (e) { }
    return restorePrevScroll(prevScrollTop, prevScrollLeft, prevActive);
  }
  const derivedCacheRef = useRef({ filtered: new Map(), dev: new Map() });
  function getListSignature(list) {
    try {
      if (!Array.isArray(list)) return String(list || '');
      return `${list.length}:${list.map(a => (a && a.id) ? String(a.id) : ((a && a.rank) ? `#${a.rank}` : (a && a.name) ? String(a.name).slice(0,24) : '__')) .join(',')}`;
    } catch (e) {
      try { return String(list.length || 0); } catch (ee) { return '0'; }
    }
  }
  useEffect(() => {
    try {
      const c = derivedCacheRef.current;
      if (c) { try { c.filtered && c.filtered.clear(); } catch (e) { } try { c.dev && c.dev.clear(); } catch (e) { } }
    } catch (e) {}
  }, [achievements, reordered, stagedReordered, sortKey, sortDir, randomSeed, _normalizedFilterTags, queryTokens]);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);
  const inputValueRef = useRef(search);
  const setSearchDebounceRef = useRef(null);
  const [manualSearch, setManualSearch] = useState('');

  const [noMatchMessage, setNoMatchMessage] = useState('');
  const debouncedSearch = useDebouncedValue(search, { minDelay: 120, maxDelay: 400, useIdle: true });
  const debouncedManualSearch = useDebouncedValue(manualSearch, { minDelay: 100, maxDelay: 300, useIdle: false });

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const rawQuery = (e.target && typeof e.target.value === 'string') ? (e.target.value || '').trim() : (search || '').trim();
    const query = rawQuery.toLowerCase();
    if (!query) return;
    if (query === 'edit') {
      if (!devModeRef.current) {
        devModeRef.current = true;
        setDevMode(true);
      }
      if (!reorderedRef.current) {
        const copy = (achievementsRef.current || []).map(a => ({ ...a }));
        reorderedRef.current = copy;
        setReordered(copy);
      }
      setSearch('');
      if (document && document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      return;
    }

    setManualSearch(rawQuery);
    setPendingSearchJump(rawQuery);
    setSearchJumpPending(true);
    setVisibleCount(0);
    if (document && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  }, []);

  const handleVisibleInputChange = useCallback((e) => {
    try { inputValueRef.current = e.target.value; } catch (err) { inputValueRef.current = ''; }
    try { setManualSearch(''); } catch (err) { }
    if (setSearchDebounceRef.current) clearTimeout(setSearchDebounceRef.current);
    setSearchDebounceRef.current = setTimeout(() => {
      try { setSearch(inputValueRef.current || ''); } catch (err) { }
      setSearchDebounceRef.current = null;
    }, 120);
  }, []);

  useEffect(() => {
    return () => {
      try { if (setSearchDebounceRef.current) clearTimeout(setSearchDebounceRef.current); } catch (e) { }
    };
  }, []);

  useEffect(() => {
    try {
      const el = searchInputRef.current;
      if (el && typeof el.value === 'string' && el.value !== (search || '')) {
        el.value = search || '';
        inputValueRef.current = el.value;
      }
    } catch (e) { }
  }, [search]);
  const [filterTags, setFilterTags] = useState({ include: [], exclude: [] });
  const filterTagsRef = useRef(filterTags);
  useEffect(() => { filterTagsRef.current = filterTags; }, [filterTags]);

  const [allTags, setAllTags] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const mobileBtnRef = useRef();
  const [isPending, startTransition] = typeof useTransition === 'function' ? useTransition() : [false, fn => fn()];
  const { dateFormat, setDateFormat } = useDateFormat();
  const [showSettings, setShowSettings] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const devModeRef = useRef(devMode);
  useEffect(() => { devModeRef.current = devMode; }, [devMode]);

  const hideRank = storageKeySuffix === 'pending' || dataFileName === 'pending.json';

  const [originalAchievements, setOriginalAchievements] = useState(null);
  const [sortKey, setSortKey] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem(`thal_sort_key_${storageKeySuffix}`);
        if (v) return v;
      }
    } catch (e) { }
    return 'rank';
  });

  const [sortDir, setSortDir] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem(`thal_sort_dir_${storageKeySuffix}`);
        if (v) return v;
      }
    } catch (e) { }
    return 'asc';
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

  const [reordered, setReordered] = useState(null);
  const reorderedRef = useRef(reordered);
  useEffect(() => { reorderedRef.current = reordered; }, [reordered]);
  const [stagedReordered, setStagedReordered] = useState(null);
  const stagedRef = useRef(stagedReordered);
  useEffect(() => { stagedRef.current = stagedReordered; }, [stagedReordered]);
  const ongoingFilterControllerRef = useRef(null);
  const manualSearchControllerRef = useRef(null);
  useEffect(() => () => { try { if (manualSearchControllerRef.current && typeof manualSearchControllerRef.current.abort === 'function') manualSearchControllerRef.current.abort(); } catch (e) { } }, []);
  const [randomSeed, setRandomSeed] = useState(null);
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
  const pasteIndexRef = useRef([]);
  const pastePrefixMapRef = useRef(new Map());
  const debouncedPasteSearch = useDebouncedValue(pasteSearch, { minDelay: 80, maxDelay: 250, useIdle: true });
  const [pendingSearchJump, setPendingSearchJump] = useState(null);
  const [extraLists, setExtraLists] = useState({});
  const EXTRA_FILES = ['pending.json', 'legacy.json', 'platformers.json', 'platformertimeline.json', 'timeline.json', 'removed.json'];
  const [insertIdx, setInsertIdx] = useState(null);
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editFormTags, setEditFormTags] = useState([]);
  const [editFormCustomTags, setEditFormCustomTags] = useState('');
  const achievementRefs = useRef([]);

  function batchUpdateReordered(mutator) {
    if (typeof mutator !== 'function') return;
    startTransition(() => {
      if (stagedRef.current && Array.isArray(stagedRef.current)) {
        setStagedReordered(prev => {
          const copy = Array.isArray(prev) ? prev.map(a => ({ ...(a || {}) })) : [];
          try {
            const result = mutator(copy) || copy;
            if (Array.isArray(result)) {
              result.forEach((a, i) => { if (a) a.rank = i + 1; });
              return result;
            }
          } catch (e) {
            return prev;
          }
          return prev;
        });
      } else {
        setReordered(prev => {
          const copy = Array.isArray(prev) ? prev.map(a => ({ ...(a || {}) })) : [];
          try {
            const result = mutator(copy) || copy;
            if (Array.isArray(result)) {
              result.forEach((a, i) => { if (a) a.rank = i + 1; });
              return result;
            }
          } catch (e) {
            return prev;
          }
          return prev;
        });
      }
    });
  }

  function resolveRealIdx(displayIdx) {
    try {
      const currentReordered = (stagedReordered && Array.isArray(stagedReordered) && stagedReordered.length) ? stagedReordered : reordered;
      if (!currentReordered || !Array.isArray(currentReordered) || currentReordered.length === 0) return displayIdx;
      if (currentReordered[displayIdx] && devAchievements && devAchievements[displayIdx] && currentReordered[displayIdx].id && devAchievements[displayIdx].id && currentReordered[displayIdx].id === devAchievements[displayIdx].id) {
        return displayIdx;
      }
      if (currentReordered[displayIdx] && (!devAchievements || !devAchievements.length || devAchievements.findIndex(x => x && x.id ? x.id === currentReordered[displayIdx].id : false) === -1)) {
        return displayIdx;
      }
      const displayed = (devAchievements && devAchievements.length) ? devAchievements[displayIdx] : null;
      if (!displayed) return displayIdx;
      if (displayed.id) {
        const real = currentReordered.findIndex(x => x && x.id ? x.id === displayed.id : false);
        return real === -1 ? displayIdx : real;
      }
      const realByObj = currentReordered.findIndex(x => x === displayed);
      return realByObj === -1 ? displayIdx : realByObj;
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
    const ensureStaged = () => {
      if (stagedRef.current && Array.isArray(stagedRef.current)) return stagedRef.current;
      const base = Array.isArray(stagedRef.current) ? stagedRef.current : (Array.isArray(reorderedRef.current) ? reorderedRef.current : (Array.isArray(achievementsRef.current) ? achievementsRef.current : []));
      const copy = base.map(a => ({ ...(a || {}) }));
      setStagedReordered(copy);
      return copy;
    };
    startTransition(() => {
      if (stagedRef.current && Array.isArray(stagedRef.current)) {
        setStagedReordered(prev => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          const len = arr.length;
          if (realIdx <= 0 || realIdx >= len) return prev;
          const [removed] = arr.splice(realIdx, 1);
          arr.splice(realIdx - 1, 0, removed);
          const iA = realIdx - 1;
          const iB = realIdx;
          if (arr[iA]) arr[iA] = { ...arr[iA], rank: iA + 1 };
          if (arr[iB]) arr[iB] = { ...arr[iB], rank: iB + 1 };
          return arr;
        });
      } else {
        ensureStaged();
        setStagedReordered(prev => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          const len = arr.length;
          if (realIdx <= 0 || realIdx >= len) return prev;
          const [removed] = arr.splice(realIdx, 1);
          arr.splice(realIdx - 1, 0, removed);
          const iA = realIdx - 1;
          const iB = realIdx;
          if (arr[iA]) arr[iA] = { ...arr[iA], rank: iA + 1 };
          if (arr[iB]) arr[iB] = { ...arr[iB], rank: iB + 1 };
          return arr;
        });
      }
      try {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          try {
            restoreScrollToIndex(realIdx - 1, prevScrollTop, prevScrollLeft, prevActive);
          } catch (e) { }
        }));
      } catch (e) { }
    });
  }

  function handleMoveAchievementDown(idx) {
    const realIdx = resolveRealIdx(idx);
    const scrollEl = (typeof document !== 'undefined') ? (document.scrollingElement || document.documentElement || document.body) : null;
    const prevScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const prevScrollLeft = scrollEl ? scrollEl.scrollLeft : 0;
    const prevActive = (typeof document !== 'undefined') ? document.activeElement : null;
    const ensureStaged = () => {
      if (stagedRef.current && Array.isArray(stagedRef.current)) return stagedRef.current;
      const base = Array.isArray(stagedRef.current) ? stagedRef.current : (Array.isArray(reorderedRef.current) ? reorderedRef.current : (Array.isArray(achievementsRef.current) ? achievementsRef.current : []));
      const copy = base.map(a => ({ ...(a || {}) }));
      setStagedReordered(copy);
      return copy;
    };
    startTransition(() => {
      if (stagedRef.current && Array.isArray(stagedRef.current)) {
        setStagedReordered(prev => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          const len = arr.length;
          if (realIdx < 0 || realIdx >= len - 1) return prev;
          const [removed] = arr.splice(realIdx, 1);
          arr.splice(realIdx + 1, 0, removed);
          const iA = realIdx;
          const iB = realIdx + 1;
          if (arr[iA]) arr[iA] = { ...arr[iA], rank: iA + 1 };
          if (arr[iB]) arr[iB] = { ...arr[iB], rank: iB + 1 };
          return arr;
        });
      } else {
        ensureStaged();
        setStagedReordered(prev => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          const len = arr.length;
          if (realIdx < 0 || realIdx >= len - 1) return prev;
          const [removed] = arr.splice(realIdx, 1);
          arr.splice(realIdx + 1, 0, removed);
          const iA = realIdx;
          const iB = realIdx + 1;
          if (arr[iA]) arr[iA] = { ...arr[iA], rank: iA + 1 };
          if (arr[iB]) arr[iB] = { ...arr[iB], rank: iB + 1 };
          return arr;
        });
      }
      try {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          try {
            restoreScrollToIndex(realIdx + 1, prevScrollTop, prevScrollLeft, prevActive);
          } catch (e) { }
        }));
      } catch (e) { }
    });
  }

  function handleCheckDuplicateThumbnails() {
    const items = devMode && reordered ? reordered : achievements;
    const map = new Map();
    items.forEach((a, i) => {
      const thumb = (a && a.thumbnail) ? a.thumbnail : (a && a.levelID) ? `https://levelthumbs.prevter.me/thumbnail/${a.levelID}` : '';
      const key = String(thumb || '').trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    const dupKeys = new Set();
    map.forEach((count, key) => { if (count > 1) dupKeys.add(key); });
    setDuplicateThumbKeys(dupKeys);
  }
  const [scrollToIdx, setScrollToIdx] = useState(null);
  const [changelogPreview, setChangelogPreview] = useState(null);
  const [showChangelogPreview, setShowChangelogPreview] = useState(false);

  useEffect(() => {
    try { if (neighborContextRef && neighborContextRef.current) neighborContextRef.current.clear(); } catch (e) { }
  }, [achievements, reordered]);
  function handleEditAchievement(idx) {
    const realIdx = resolveRealIdx(idx);
    if (!reordered || !reordered[realIdx]) return;
    const a = reordered[realIdx];
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
  }

  function handleEditFormChange(e) {
    const { name, value } = e.target;
    let newVal;
    if (name === 'id') {

      newVal = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
    } else {

      if (name === 'video' || name === 'showcaseVideo') {
        const norm = normalizeYoutubeUrl(value);
        newVal = devMode ? (norm || String(value || '').trim()) : norm;
      } else {
        newVal = (['levelID', 'length'].includes(name) ? Number(value) : value);
      }
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
      if (k === 'version') {
        const num = Number(v);
        if (!isNaN(num)) {
          entry[k] = num;
        }
        return;
      }
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

    if (entry.video) {
      const nv = normalizeYoutubeUrl(entry.video);
      if (nv) entry.video = nv;
      else if (!devMode) delete entry.video;
    }
    if (entry.showcaseVideo) {
      const nv2 = normalizeYoutubeUrl(entry.showcaseVideo);
      if (nv2) entry.showcaseVideo = nv2;
      else if (!devMode) delete entry.showcaseVideo;
    }

    batchUpdateReordered(arr => {
      if (!arr) return arr;
      const original = arr[editIdx];

      const newRank = entry && entry.rank !== undefined && entry.rank !== null && entry.rank !== '' ? Number(entry.rank) : null;
      const oldRank = original ? Number(original.rank) : null;
      const rankIsChanging = newRank !== null && !isNaN(newRank) && newRank !== oldRank;

      if (rankIsChanging) {
        const [removed] = arr.splice(editIdx, 1);
        const updated = enhanceAchievement({ ...removed, ...entry });
        const idx = Math.max(0, Math.min(arr.length, newRank - 1));
        arr.splice(idx, 0, updated);
      } else {
        arr[editIdx] = enhanceAchievement({ ...original, ...entry });
      }

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

  function generateAndCopyChangelog() {
    const original = originalAchievements || [];
    const current = (stagedReordered && stagedReordered.length) ? stagedReordered : (reordered && reordered.length) ? reordered : achievements || [];

    if (dataFileName === 'pending.json') {
      if (!current || !current.length) {
        alert('No pending achievements to copy.');
        return;
      }
      const sorted = [...current].sort((a, b) => {
        try {
          const da = parseAsLocal(a && a.date);
          const db = parseAsLocal(b && b.date);
          const ta = da && !isNaN(da) ? da.getTime() : 0;
          const tb = db && !isNaN(db) ? db.getTime() : 0;
          return tb - ta;
        } catch (e) {
          return 0;
        }
      });

      let formatted = ':clock3: **Achievements in pending...**\n';
      sorted.forEach(a => {
        const id = a && a.id ? encodeURIComponent(a.id) : '';
        const name = a && a.name ? a.name : 'Unknown';
        formatted += `> [${name}](https://thal.vercel.app/achievement/${id})\n`;
      });

      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(formatted).then(() => alert('Pending list copied to clipboard!')).catch(() => alert('Failed to copy to clipboard'));
      } else {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = formatted;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          alert('Pending list copied to clipboard!');
        } catch (e) {
          alert('Clipboard API not available');
        }
      }
      return;
    }

    if (!original || !original.length) {
      alert('Original JSON not available to diff against.');
      return;
    }

    const byIdOriginal = new Map();
    original.forEach(a => { if (a && a.id) byIdOriginal.set(a.id, a); });
    const byIdCurrent = new Map();
    current.forEach(a => { if (a && a.id) byIdCurrent.set(a.id, a); });

    const changes = [];

    for (const [id, a] of byIdOriginal.entries()) {
      if (!byIdCurrent.has(id)) {
        const changeType = mode === 'timeline' ? 'timelineRemoved' : 'removed';
        changes.push({ type: changeType, achievement: a, oldAchievement: a, oldRank: a.rank });
      }
    }

    for (const [id, a] of byIdCurrent.entries()) {
      if (!byIdOriginal.has(id)) {
        const changeType = mode === 'timeline' ? 'timelineAdded' : 'added';
        changes.push({ type: changeType, achievement: a, newIndex: (a && a.rank) ? a.rank - 1 : null });
      }
    }

    for (const [id, orig] of byIdOriginal.entries()) {
      if (!byIdCurrent.has(id)) continue;
      const curr = byIdCurrent.get(id);
      if (!curr) continue;

      if ((orig.name || '') !== (curr.name || '')) {
        changes.push({ type: 'renamed', oldAchievement: orig, achievement: curr });
      }

      const oldRank = Number(orig.rank) || null;
      const newRank = Number(curr.rank) || null;
      if (mode !== 'timeline' && oldRank != null && newRank != null && oldRank !== newRank) {
        changes.push({ type: newRank < oldRank ? 'movedUp' : 'movedDown', achievement: curr, oldRank, newRank });
      }
    }

    function getLevelBase(name) {
      if (!name || typeof name !== 'string') return '';
      const parts = name.trim().split(/\s+/);
      if (parts.length <= 1) return name.toLowerCase();
      const lastPart = parts[parts.length - 1];
      if (lastPart.match(/^\d+(\s*\+\s*\d+)?%?$/)) {
        return parts.slice(0, -1).join(' ').toLowerCase();
      }
      return name.toLowerCase();
    }

    function areRelated(ach1, ach2) {
      if (!ach1 || !ach2) return false;

      const base1 = getLevelBase(ach1.name);
      const base2 = getLevelBase(ach2.name);
      const player1 = (ach1.player || '').toLowerCase().trim();
      const player2 = (ach2.player || '').toLowerCase().trim();

      if (base1 === base2 && player1 === player2 && player1) return true;

      if (base1 && base2 && (base1.includes(base2) || base2.includes(base1))) return true;

      return false;
    }

    const addedChanges = changes.filter(c => c && c.type === 'added');
    const removedChanges = changes.filter(c => c && c.type === 'removed');
    const suppressedIndices = new Set();
    const convertedToRenames = new Set();

    for (let i = 0; i < addedChanges.length; i++) {
      const addedChange = addedChanges[i];
      if (!addedChange.achievement) continue;

      for (let j = 0; j < removedChanges.length; j++) {
        if (suppressedIndices.has(j)) continue;
        const removedChange = removedChanges[j];
        if (!removedChange.achievement) continue;

        const sameRank = Number(addedChange.achievement.rank) === Number(removedChange.achievement.rank);

        if (sameRank && areRelated(addedChange.achievement, removedChange.achievement)) {
          const addIdx = changes.indexOf(addedChange);
          if (addIdx !== -1) {
            changes[addIdx] = {
              type: 'renamed',
              oldAchievement: removedChange.achievement,
              achievement: addedChange.achievement
            };
            convertedToRenames.add(addIdx);
          }
          suppressedIndices.add(j);
          break;
        }
      }
    }

    for (let i = 0; i < addedChanges.length; i++) {
      const addedChange = addedChanges[i];
      if (!addedChange.achievement || convertedToRenames.has(changes.indexOf(addedChange))) continue;

      const related = [];
      for (let j = 0; j < removedChanges.length; j++) {
        if (suppressedIndices.has(j)) continue;
        const removedChange = removedChanges[j];
        if (!removedChange.achievement) continue;

        const sameRank = Number(addedChange.achievement.rank) === Number(removedChange.achievement.rank);

        if (sameRank) continue;

        if (areRelated(addedChange.achievement, removedChange.achievement)) {
          related.push(j);
        }
      }

      if (related.length > 0) {
        const changeIdx = changes.indexOf(addedChange);
        if (changeIdx !== -1) {
          changes[changeIdx] = {
            ...addedChange,
            type: 'addedWithRemovals',
            removedDuplicates: related.map(idx => removedChanges[idx].achievement)
          };
          related.forEach(idx => suppressedIndices.add(idx));
        }
      }
    }

    for (let j = 0; j < removedChanges.length; j++) {
      if (suppressedIndices.has(j)) continue;
      const removedChange = removedChanges[j];
      if (!removedChange.achievement) continue;

      const related = [];
      for (let i = 0; i < addedChanges.length; i++) {
        const addedChange = addedChanges[i];
        if (!addedChange.achievement) continue;
        if (addedChange.type === 'addedWithRemovals') continue;
        if (convertedToRenames.has(changes.indexOf(addedChange))) continue;

        const sameRank = Number(removedChange.achievement.rank) === Number(addedChange.achievement.rank);

        if (sameRank) continue;

        if (areRelated(addedChange.achievement, removedChange.achievement)) {
          related.push(addedChange);
        }
      }

      if (related.length > 0) {
        const changeIdx = changes.indexOf(removedChange);
        if (changeIdx !== -1) {
          changes[changeIdx] = {
            ...removedChange,
            type: 'removedWithReadds',
            readdedAchievements: related.map(c => c.achievement)
          };
        }
      }
    }

    const changesList = changes.filter((c, idx) => {
      if (!c) return false;
      const removedIdx = removedChanges.indexOf(c);
      if (removedIdx !== -1 && suppressedIndices.has(removedIdx)) return false;
      return true;
    });

    const addedPositions = changesList.filter(c => c && (c.type === 'added' || c.type === 'addedWithRemovals') && c.achievement && c.achievement.rank).map(c => Number(c.achievement.rank));
    const removedRanks = changesList.filter(c => c && (c.type === 'removed' || c.type === 'removedWithReadds')).map(c => Number(c.oldRank || 0));

    const readdedPositions = [];
    const removedDuplicateRanks = [];
    changesList.forEach(c => {
      if (c && c.type === 'removedWithReadds' && c.readdedAchievements) {
        c.readdedAchievements.forEach(a => {
          if (a && a.rank) readdedPositions.push(Number(a.rank));
        });
      }
      if (c && c.type === 'addedWithRemovals' && c.removedDuplicates) {
        c.removedDuplicates.forEach(a => {
          if (a && a.rank) removedDuplicateRanks.push(Number(a.rank));
        });
      }
    });

    const allAddedPositions = [...addedPositions, ...readdedPositions];
    const allRemovedRanks = [...removedRanks, ...removedDuplicateRanks];

    const moveChanges = changesList.filter(c => c && (c.type === 'movedUp' || c.type === 'movedDown'));
    const suppressedIds = new Set();
    const swappedIds = new Set();

    for (let i = 0; i < moveChanges.length; i++) {
      const a = moveChanges[i];
      if (!a || !a.achievement) continue;
      for (let j = i + 1; j < moveChanges.length; j++) {
        const b = moveChanges[j];
        if (!b || !b.achievement) continue;
        if (a.oldRank === b.newRank && a.newRank === b.oldRank) {
          swappedIds.add(a.achievement.id);
          swappedIds.add(b.achievement.id);
        }
      }
    }

    if (allAddedPositions && allAddedPositions.length) {
      for (const m of moveChanges) {
        if (!m || !m.achievement || m.type !== 'movedDown') continue;
        if (swappedIds.has(m.achievement.id)) continue;
        const oldR = Number(m.oldRank) || 0;
        const newR = Number(m.newRank) || 0;
        const delta = newR - oldR;
        if (delta === 1) {
          const causedByAddition = allAddedPositions.some(pos => {
            const addPos = Number(pos);
            return addPos <= newR;
          });
          if (causedByAddition) suppressedIds.add(m.achievement.id);
        }
      }
    }

    if (allRemovedRanks && allRemovedRanks.length) {
      for (const m of moveChanges) {
        if (!m || !m.achievement || m.type !== 'movedUp') continue;
        if (swappedIds.has(m.achievement.id)) continue;
        const oldR = Number(m.oldRank) || 0;
        const newR = Number(m.newRank) || 0;
        const delta = oldR - newR;
        if (delta === 1) {
          const causedByRemoval = allRemovedRanks.some(pos => {
            const remPos = Number(pos);
            return remPos <= oldR;
          });
          if (causedByRemoval) suppressedIds.add(m.achievement.id);
        }
      }
    }

    if (moveChanges && moveChanges.length) {
      const movesMap = new Map();
      moveChanges.forEach(m => {
        if (!m || !m.achievement) return;
        const id = m.achievement.id;
        movesMap.set(id, {
          oldRank: Number(m.oldRank) || null,
          newRank: Number(m.newRank) || null,
          type: m.type,
          achievement: m.achievement
        });
      });

      for (const [id, mv] of movesMap.entries()) {
        if (!mv || mv.oldRank == null || mv.newRank == null) continue;
        const delta = mv.newRank - mv.oldRank;
        if (delta === 0) continue;
        if (delta < 0) {
          const low = mv.newRank;
          const high = mv.oldRank - 1;
          for (const [otherId, other] of movesMap.entries()) {
            if (otherId === id) continue;
            if (suppressedIds.has(otherId)) continue;
            if (other.oldRank === mv.newRank && other.newRank === mv.oldRank) continue;
            if (other.oldRank >= low && other.oldRank <= high && (other.newRank === other.oldRank + 1)) {
              suppressedIds.add(otherId);
            }
          }
        } else {
          const low = mv.oldRank + 1;
          const high = mv.newRank;
          for (const [otherId, other] of movesMap.entries()) {
            if (otherId === id) continue;
            if (suppressedIds.has(otherId)) continue;
            if (other.oldRank === mv.newRank && other.newRank === mv.oldRank) continue;
            if (other.oldRank >= low && other.oldRank <= high && (other.newRank === other.oldRank - 1)) {
              suppressedIds.add(otherId);
            }
          }
        }
      }
    }
    for (let i = 0; i < moveChanges.length; i++) {
      const a = moveChanges[i];
      if (!a || !a.achievement || suppressedIds.has(a.achievement.id)) continue;
      for (let j = i + 1; j < moveChanges.length; j++) {
        const b = moveChanges[j];
        if (!b || !b.achievement || suppressedIds.has(b.achievement.id)) continue;
        if (a.oldRank === b.newRank && a.newRank === b.oldRank) {
          if (a.type === 'movedUp' && b.type === 'movedDown') suppressedIds.add(b.achievement.id);
          else if (b.type === 'movedUp' && a.type === 'movedDown') suppressedIds.add(a.achievement.id);
        }
      }
    }

    const baseList = current;
    const filteredChanges = changesList.filter(c => {
      if (!c) return false;
      if (mode === 'timeline' && (c.type === 'movedUp' || c.type === 'movedDown' || c.type === 'swapped')) return false;
      if ((c.type === 'movedUp' || c.type === 'movedDown') && c.achievement && suppressedIds.has(c.achievement.id)) return false;
      return true;
    });

    const finalChanges = [...filteredChanges];
    {
      const used = new Set();
      const collapsed = [];
      for (let i = 0; i < finalChanges.length; i++) {
        if (used.has(i)) continue;
        const a = finalChanges[i];
        if (!a || !(a.type === 'movedUp' || a.type === 'movedDown') || !a.achievement) {
          collapsed.push(a);
          used.add(i);
          continue;
        }
        let found = -1;
        for (let j = i + 1; j < finalChanges.length; j++) {
          if (used.has(j)) continue;
          const b = finalChanges[j];
          if (!b || !(b.type === 'movedUp' || b.type === 'movedDown') || !b.achievement) continue;
          if (a.oldRank === b.newRank && a.newRank === b.oldRank) {
            found = j;
            break;
          }
        }
        if (found !== -1) {
          const b = finalChanges[found];
          const swap = {
            type: 'swapped',
            achievement: a.achievement,
            oldAchievement: b.achievement,
            oldRank: a.oldRank,
            newRank: a.newRank,
            newRankB: b.newRank,
            oldRankB: b.oldRank
          };
          collapsed.push(swap);
          used.add(i);
          used.add(found);
        } else {
          collapsed.push(a);
          used.add(i);
        }
      }
      for (let k = 0; k < finalChanges.length; k++) {
        if (!used.has(k)) collapsed.push(finalChanges[k]);
      }
      finalChanges.length = 0;
      for (const it of collapsed) finalChanges.push(it);
    }
    for (let i = 0; i < finalChanges.length; i++) {
      const x = finalChanges[i];
      if (!x || !(x.type === 'movedUp' || x.type === 'movedDown') || !x.achievement) continue;
      for (let j = i + 1; j < finalChanges.length; j++) {
        const y = finalChanges[j];
        if (!y || !(y.type === 'movedUp' || y.type === 'movedDown') || !y.achievement) continue;
        if (x.oldRank === y.newRank && x.newRank === y.oldRank) {
          if (x.type === 'movedUp' && y.type === 'movedDown') {
            finalChanges.splice(j, 1);
            j--;
          } else if (y.type === 'movedUp' && x.type === 'movedDown') {
            finalChanges.splice(i, 1);
            i--;
            break;
          }
        }
      }
    }

    const now = Date.now();
    const firstId = (baseList && baseList[0] && baseList[0].id) ? String(baseList[0].id) : '';
    const lastId = (baseList && baseList[baseList.length - 1] && baseList[baseList.length - 1].id) ? String(baseList[baseList.length - 1].id) : '';
    const cacheKey = `${storageKeySuffix}::${(baseList || []).length}::${firstId}::${lastId}`;
    let idIndexMap;
    const cached = _idIndexCache.get(cacheKey);
    if (cached && (now - cached.ts) < ID_INDEX_TTL_MS) {
      idIndexMap = cached.map;
    } else {
      const map = new Map();
      (baseList || []).forEach((a, i) => { if (a && a.id) map.set(a.id, i); });
      _idIndexCache.set(cacheKey, { map, ts: now });
      idIndexMap = map;
    }

    let formatted = finalChanges.map(c => formatChangelogEntry(c, baseList, mode, idIndexMap, neighborContextRef.current)).filter(s => s && s.trim()).join('\n\n');

    if (finalChanges && finalChanges.length > 20) {
      const previewEntries = finalChanges.map(c => formatChangelogEntry(c, baseList, mode, idIndexMap, neighborContextRef.current)).filter(s => s && s.trim());
      setChangelogPreview(previewEntries);
      setShowChangelogPreview(true);
      return;
    }

    if (!formatted || formatted.trim() === '') {
      const moveOnly = finalChanges.filter(c => c && (c.type === 'movedUp' || c.type === 'movedDown'));
      if (moveOnly && moveOnly.length) {
        const byPair = new Map();
        moveOnly.forEach(m => {
          const key = `${Math.min(m.oldRank, m.newRank)}:${Math.max(m.oldRank, m.newRank)}`;
          if (!byPair.has(key)) byPair.set(key, []);
          byPair.get(key).push(m);
        });
        const chosen = [];
        for (const arr of byPair.values()) {
          if (!arr || !arr.length) continue;
          if (arr.length === 1) chosen.push(arr[0]);
          else {
            const up = arr.find(x => x.type === 'movedUp');
            if (up) chosen.push(up);
            else chosen.push(arr[0]);
          }
        }
        const alt = chosen.map(c => formatChangelogEntry(c, baseList, mode, idIndexMap, neighborContextRef.current)).filter(s => s && s.trim()).join('\n\n');
        if (alt && alt.trim()) formatted = alt;
      }
    }

    if (!formatted) {
      alert('No changes detected');
      return;
    }

    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(formatted).then(() => alert('Changelog copied to clipboard!')).catch(() => alert('Failed to copy to clipboard'));
    } else {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = formatted;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Changelog copied to clipboard!');
      } catch (e) {
        alert('Clipboard API not available');
      }
    }
  }

  function resetChanges() {
    if (!originalAchievements || !originalAchievements.length) {
      alert('No original JSON loaded to reset to.');
      return;
    }
    const ok = typeof window !== 'undefined' ? window.confirm('Are you sure you want to reset all changes and restore the original JSON?') : true;
    if (!ok) return;
    try {
      const restored = originalAchievements.map(a => ({ ...a }));
      setReordered(restored);
      setDevMode(false);
      setEditIdx(null);
      setEditForm(null);
      setEditFormTags([]);
      setNewForm({ name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: [] });
      setNewFormTags([]);
      setNewFormCustomTags('');
      setInsertIdx(null);
      setScrollToIdx(0);
    } catch (e) {
      console.error('Failed to reset changes', e);
      alert('Failed to reset changes');
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
        if (dataFileName === 'pending.json') {
          const enhanced = valid.map(enhanceAchievement);
          setAchievements(enhanced);
          setOriginalAchievements(valid.map((a, i) => ({ ...a, rank: i + 1 })));
        } else {
          const withRank = valid.map((a, i) => ({ ...a, rank: i + 1 }));
          const enhanced = withRank.map(enhanceAchievement);
          setAchievements(enhanced);
          setOriginalAchievements(withRank.map(a => ({ ...a })));
        }
        const tagSet = new Set();
        if (data && Array.isArray(data.tags)) data.tags.forEach(t => tagSet.add(t));
        valid.forEach(a => (a.tags || []).forEach(t => tagSet.add(t)));
        setAllTags(Array.from(tagSet));
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
      const thumb = (top.thumbnail && String(top.thumbnail).trim()) ? top.thumbnail : (top.levelID ? `https://levelthumbs.prevter.me/thumbnail/${top.levelID}` : null);
      setBgImage(thumb || null);
    } catch (e) {
      setBgImage(null);
    }
  }, [achievements, usePlatformers]);

  const router = useRouter();

  const handleKeyDown = useCallback((e) => {
    if (e.shiftKey && (e.key === 'M' || e.key === 'm')) {
      setDevMode(v => {
        const next = !v;
        if (!next) {
            if (stagedRef.current && Array.isArray(stagedRef.current)) {
              setReordered(stagedRef.current.map(a => ({ ...(a || {}) })));
              setStagedReordered(null);
            } else {
              setReordered(null);
              reorderedRef.current = null;
            }
        } else {
          setReordered(achievementsRef.current);
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

  const _normalizedFilterTags = useMemo(() => {
    const inc = Array.isArray(filterTags.include) ? filterTags.include.slice().map(s => String(s || '').toUpperCase()) : [];
    const exc = Array.isArray(filterTags.exclude) ? filterTags.exclude.slice().map(s => String(s || '').toUpperCase()) : [];
    return { include: inc, exclude: exc };
  }, [filterTags.include, filterTags.exclude]);

  const filterFn = useCallback(
    a => {
      const tags = (a.tags || []).map(t => String(t || '').toUpperCase());
      const include = _normalizedFilterTags.include;
      const exclude = _normalizedFilterTags.exclude;
      if (include.length && !include.every(tag => tags.includes(tag))) return false;
      if (exclude.length && exclude.some(tag => tags.includes(tag))) return false;
      if (queryTokens && queryTokens.length) {
        const itemTokens = (a && a._searchableNormalized) ? _tokensFromNormalized(a._searchableNormalized) : _tokensFromNormalized(normalizeForSearch([a && a.name, a && a.player, a && a.id, a && a.levelID].filter(Boolean).join(' ')));
        if (!itemTokens || itemTokens.length === 0) return false;
        if (!queryTokens.every(qt => itemTokens.some(t => typeof t === 'string' && t.startsWith(qt)))) return false;
      }
      return true;
    },
    [_normalizedFilterTags, queryTokens]
  );

  const [filtered, setFiltered] = useState([]);
  useEffect(() => {
    try { if (ongoingFilterControllerRef.current && typeof ongoingFilterControllerRef.current.abort === 'function') ongoingFilterControllerRef.current.abort(); } catch (e) { }
    const controller = { aborted: false, abort() { this.aborted = true; } };
    ongoingFilterControllerRef.current = controller;

    try {
      const itemsSigList = Array.isArray(achievements) ? achievements : [];
      const filterTagSig = `${(_normalizedFilterTags && _normalizedFilterTags.include) ? _normalizedFilterTags.include.join(',') : ''}|${(_normalizedFilterTags && _normalizedFilterTags.exclude) ? _normalizedFilterTags.exclude.join(',') : ''}`;
      const qSig = (queryTokens && queryTokens.length) ? queryTokens.join(',') : '';
      const filterSig = `${getListSignature(itemsSigList)}|${filterTagSig}|${qSig}|${String(sortKey||'')}|${String(sortDir||'')}|${String(randomSeed||'')}`;
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
            try {
              if (controller.aborted) return onProcessingComplete(null);
              const q = queryTokens.join(' ');
              const fuseOpts = {
                keys: [
                  { name: 'name', weight: 0.6 },
                  { name: 'player', weight: 0.2 },
                  { name: 'id', weight: 0.1 },
                  { name: 'levelID', weight: 0.05 },
                  { name: 'tags', weight: 0.05 }
                ],
                threshold: 0.3,
                ignoreLocation: true,
                minMatchCharLength: 2,
              };
              const fuse = new Fuse(tagFiltered, fuseOpts);
              const res = fuse.search(q);
              const searched = res.map(r => (r && r.item) ? r.item : r);
              return onProcessingComplete(searched);
            } catch (e) {
              return onProcessingComplete(tagFiltered);
            }
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
              try { try { const cache = derivedCacheRef.current && derivedCacheRef.current.filtered; if (cache) cache.set(filterSig, copy); } catch (ee) {} setFiltered(copy); } catch (e) { }
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
              try { try { const cache = derivedCacheRef.current && derivedCacheRef.current.filtered; if (cache) cache.set(filterSig, copy); } catch (ee) {} setFiltered(copy); } catch (e) { }
              return;
            }
            if (sortKey) {
              const copy = [...result];
              copy.sort((x, y) => compareByKey(x, y, sortKey));
              if (sortDir === 'desc') copy.reverse();
              try { try { const cache = derivedCacheRef.current && derivedCacheRef.current.filtered; if (cache) cache.set(filterSig, copy); } catch (ee) {} setFiltered(copy); } catch (e) { }
              return;
            }
            try { try { const cache = derivedCacheRef.current && derivedCacheRef.current.filtered; if (cache) cache.set(filterSig, result); } catch (ee) {} setFiltered(result); } catch (e) { }
          } catch (e) { }
        }

        processTagBatch();
        return;
      }, 0);
    });

    return () => { try { controller.abort(); } catch (e) { } };
  }, [achievements, filterFn, sortKey, sortDir, compareByKey, randomSeed, startTransition]);

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

  useEffect(() => {
    if (!pendingSearchJump) return;
    if (debouncedManualSearch !== pendingSearchJump) return;

    try { if (manualSearchControllerRef && manualSearchControllerRef.current && typeof manualSearchControllerRef.current.abort === 'function') manualSearchControllerRef.current.abort(); } catch (e) { }
    const manualController = { aborted: false, abort() { this.aborted = true; } };
    manualSearchControllerRef.current = manualController;

    const rawQuery = pendingSearchJump;
    const normalizedQuery = normalizeForSearch(rawQuery || '');
    const qTokensManual = (normalizedQuery || '') ? normalizedQuery.split(' ').filter(Boolean) : [];

    const matchesQuery = a => {
      if (!a) return false;
      if (manualController.aborted) return false;
      if (!qTokensManual.length) return false;
      const itemTokens = (a && a._searchableNormalized) ? _tokensFromNormalized(a._searchableNormalized) : _tokensFromNormalized(normalizeForSearch([a && a.name, a && a.player, a && a.id, a && a.levelID, a && a.submitter].filter(Boolean).join(' ')));
      if (!itemTokens || itemTokens.length === 0) return false;
      return qTokensManual.every(qt => itemTokens.some(t => typeof t === 'string' && t.startsWith(qt)));
    };

    const respectsTagFilters = a => {
      if (manualController.aborted) return false;
      const tags = (a.tags || []).map(t => t.toUpperCase());
      const ft = filterTagsRef.current || { include: [], exclude: [] };
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
      setPendingSearchJump(null);
      setSearchJumpPending(false);
      return;
    }
    const matchingItems = [];
    for (let i = 0; i < preFiltered.length; i++) {
      if (manualController.aborted) break;
      const a = preFiltered[i];
      try { if (matchesQuery(a)) matchingItems.push(a); } catch (e) { }
    }
    if (!matchingItems || matchingItems.length === 0) {
      setPendingSearchJump(null);
      setSearchJumpPending(false);
      return;
    }

    const firstMatch = matchingItems[0];
    const targetIdxInPreFiltered = preFiltered.findIndex(a => a === firstMatch);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const countToShow = Math.max(20, matchingItems.length);
      setVisibleCount(prev => Math.max(prev, countToShow));

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
            const ft = filterTagsRef.current || { include: [], exclude: [] };
            if (ft.include.length && !ft.include.every(tag => tags.includes(tag.toUpperCase()))) return false;
            if (ft.exclude.length && ft.exclude.some(tag => tags.includes(tag.toUpperCase()))) return false;
            if (normalizedQueryLocal) {
              const itemTokens = (a && a._searchableNormalized) ? _tokensFromNormalized(a._searchableNormalized) : _tokensFromNormalized(normalizeForSearch([a && a.name, a && a.player, a && a.id, a && a.levelID, a && a.submitter].filter(Boolean).join(' ')));
              if (!itemTokens || itemTokens.length === 0) return false;
              const qts = (normalizedQueryLocal || '').split(' ').filter(Boolean);
              if (!qts.every(qt => itemTokens.some(t => typeof t === 'string' && t.startsWith(qt)))) return false;
            }
            return true;
          });
        }

        const finalIdx = visibleFiltered.findIndex(a => a === firstMatch);
        const idxToUse = finalIdx === -1 ? 0 : finalIdx;
        setScrollToIdx(idxToUse);
        if (finalIdx === -1) {
          setNoMatchMessage('No matching achievement is currently visible with the active filters.');
          window.setTimeout(() => setNoMatchMessage(''), 3000);
        } else {
        }
      }
    }));

    setPendingSearchJump(null);
    setSearchJumpPending(false);
  }, [debouncedManualSearch, pendingSearchJump, filtered, searchLower]);



  const baseDev = devMode && (stagedReordered || reordered) ? (stagedReordered || reordered) : achievements;

  const devAchievements = useMemo(() => {
    try {
      const currentOrder = (stagedIdOrder && Array.isArray(stagedIdOrder) && stagedIdOrder.length) ? stagedIdOrder : idOrder;
      if (!currentOrder || !Array.isArray(currentOrder)) return [];
      const map = idMapRef.current || new Map();
      const base = currentOrder.map(id => map.get(id)).filter(Boolean);
      const orderSig = currentOrder.join(',');
      const sig = `${orderSig}|${String(sortKey || '')}|${String(sortDir || '')}|${String(randomSeed || '')}`;
      const cache = derivedCacheRef.current && derivedCacheRef.current.dev;
      if (cache && cache.has(sig)) return cache.get(sig);

      let result = base;
      if (sortKey) {
        if (sortKey === 'levelID') {
          const onlyWithLevel = base.filter(a => { const num = Number(a && a.levelID); return !isNaN(num) && num > 0; });
          const copy = [...onlyWithLevel];
          copy.sort((x, y) => compareByKey(x, y, 'levelID'));
          if (sortDir === 'desc') copy.reverse();
          result = copy;
        } else if (sortKey === 'random') {
          const copy = [...base];
          const keys = copy.map((a, i) => (a && a.id) ? String(a.id) : `__idx_${i}`);
          const seed = randomSeed != null ? randomSeed : 1;
          const rng = mulberry32(seed);
          for (let i = keys.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const t = keys[i]; keys[i] = keys[j]; keys[j] = t;
          }
          const mapIdx = {};
          keys.forEach((k, i) => { mapIdx[k] = i; });
          const getKey = item => (item && item.id) ? String(item.id) : `__idx_${base.indexOf(item)}`;
          copy.sort((x, y) => ((mapIdx[getKey(x)] || 0) - (mapIdx[getKey(y)] || 0)));
          if (sortDir === 'desc') copy.reverse();
          result = copy;
        } else {
          const copy = [...base];
          copy.sort((x, y) => compareByKey(x, y, sortKey));
          if (sortDir === 'desc') copy.reverse();
          result = copy;
        }
      }
      try { if (cache) cache.set(sig, result); } catch (e) { }
      return result;
    } catch (e) { return []; }
  }, [idOrder, stagedIdOrder, sortKey, sortDir, compareByKey, randomSeed]);

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
            if (panel.parentElement !== root) root.appendChild(panel);
          } catch (err) { }

          panel.style.position = 'absolute';
          panel.style.left = '50%';
          panel.style.top = '50%';
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

  const precomputedVisible = useMemo(() => {
    try {
      const arr = Array.isArray(visibleList) ? visibleList : [];
      return arr.map((a, i) => {
        const thumb = getThumbnailUrl(a, isMobile);
        const isDup = duplicateThumbKeys.has((thumb || '').trim());
        const autoThumbAvailable = a && a.levelID ? !!autoThumbMap[String(a.levelID)] : false;
        const computed = (a && (Number(a.rank) || a.rank)) ? Number(a.rank) : (i + 1);
        const displayRank = Number.isFinite(Number(computed)) ? Number(computed) + (Number(rankOffset) || 0) : computed;
        return { thumb, isDup, autoThumbAvailable, displayRank };
      });
    } catch (e) { return []; }
  }, [visibleList, isMobile, duplicateThumbKeys, autoThumbMap, rankOffset]);

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
    handleMoveAchievementUp,
    handleMoveAchievementDown,
    handleEditAchievement,
    handleDuplicateAchievement,
    handleRemoveAchievement,
    onRowHoverEnter: _onRowHoverEnter,
    onRowHoverLeave: _onRowHoverLeave,
    precomputedVisible,
  }), [visibleList, isMobile, duplicateThumbKeys, mode, devMode, autoThumbMap, showTiers, usePlatformers, extraLists, rankOffset, hideRank, achievements, storageKeySuffix, dataFileName, handleMoveAchievementUp, handleMoveAchievementDown, handleEditAchievement, handleDuplicateAchievement, handleRemoveAchievement, _onRowHoverEnter, _onRowHoverLeave, precomputedVisible]);

  const ListRow = React.memo(function ListRow({ index, style, data }) {
    const {
      filtered, isMobile, duplicateThumbKeys, mode, devMode, autoThumbMap, showTiers,
      usePlatformers, extraLists, rankOffset, hideRank, achievements, storageKeySuffix, dataFileName,
      onRowHoverEnter, onRowHoverLeave, handleEditAchievement,
    } = data;
    const a = filtered[index];
    const itemStyle = { ...style, padding: 8, boxSizing: 'border-box' };
    const { thumb, isDup, autoThumbAvailable, displayRank } = (data.precomputedVisible && data.precomputedVisible[index]) || {};
    const isHighlightedLocal = false;

    return (
      <div data-index={index} style={itemStyle} key={a && a.id ? a.id : index} className={`${isDup ? 'duplicate-thumb-item' : ''}`}>
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
            const computed = (a && (Number(a.rank) || a.rank)) ? Number(a.rank) : (index + 1);
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
    const pr = pItem && (Number(pItem.rank) || pItem.rank) ? Number(pItem.rank) : (pi + 1);
    const nr = nItem && (Number(nItem.rank) || nItem.rank) ? Number(nItem.rank) : (ni + 1);
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

  function handleNewFormChange(e) {
    const { name, value } = e.target;
    let newVal;
    if (name === 'id') {

      newVal = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
    } else {
      if (name === 'video' || name === 'showcaseVideo') {
        const norm = normalizeYoutubeUrl(value);
        newVal = devMode ? (norm || String(value || '').trim()) : norm;
      } else {
        newVal = (['levelID', 'length'].includes(name) ? Number(value) : value);
      }
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
      if (k === 'version') {
        const num = Number(v);
        if (!isNaN(num)) {
          entry[k] = num;
        }
        return;
      }
      if (k === 'rank') {
        const num = Number(v);
        if (!isNaN(num)) {
          entry[k] = num;
        }
        return;
      }
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
    if (entry.video) {
      const nv = normalizeYoutubeUrl(entry.video);
      if (nv) entry.video = nv;
      else if (!devMode) delete entry.video;
    }
    if (entry.showcaseVideo) {
      const nv2 = normalizeYoutubeUrl(entry.showcaseVideo);
      if (nv2) entry.showcaseVideo = nv2;
      else if (!devMode) delete entry.showcaseVideo;
    }
    const baseBefore = (devMode && reordered) ? reordered : (reordered || achievements) || [];
    let predictedInsertedIdx = 0;
    if (!baseBefore || baseBefore.length === 0) {
      predictedInsertedIdx = 0;
    } else if (entry && entry.rank !== undefined && entry.rank !== null && entry.rank !== '' && !isNaN(Number(entry.rank))) {
      predictedInsertedIdx = Math.max(0, Math.min(baseBefore.length, Number(entry.rank) - 1));
    } else if (insertIdx === null || insertIdx < 0 || insertIdx > baseBefore.length - 1) {
      predictedInsertedIdx = baseBefore.length;
    } else {
      predictedInsertedIdx = insertIdx + 1;
    }

    const before = (stagedRef.current && Array.isArray(stagedRef.current)) ? stagedRef.current : (reorderedRef.current && Array.isArray(reorderedRef.current)) ? reorderedRef.current : (achievementsRef.current || []);
    let newArr;
    let insertedIdx = 0;
    if (!before || before.length === 0) {
      newArr = [entry];
      insertedIdx = 0;
    } else if (entry && entry.rank !== undefined && entry.rank !== null && entry.rank !== '' && !isNaN(Number(entry.rank))) {
      const idx = Math.max(0, Math.min(before.length, Number(entry.rank) - 1));
      newArr = [...before];
      newArr.splice(idx, 0, entry);
      insertedIdx = idx;
    } else if (insertIdx === null || insertIdx < 0 || insertIdx > before.length - 1) {
      newArr = [...before, entry];
      insertedIdx = before.length;
    } else {
      newArr = [...before];
      newArr.splice(insertIdx + 1, 0, entry);
      insertedIdx = insertIdx + 1;
    }

    newArr.forEach((a, i) => { if (a) a.rank = i + 1; });

    newArr = newArr.map(enhanceAchievement);
    batchUpdateReordered(() => newArr);
    setScrollToIdx(insertedIdx);
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
    const base = (devMode && reordered) ? reordered || [] : achievements || [];
    const extras = Object.values(extraLists).flat().filter(Boolean);
    const items = [...base, ...extras];
    const sig = _makePasteSignature(items);
    let idx = null;
    if (sig && _pasteIndexCache.has(sig)) {
      idx = _pasteIndexCache.get(sig);
    } else {
      idx = new Array(items.length);
      const prefixMap = new Map();
      const maxPrefix = 20;
      for (let i = 0; i < items.length; i++) {
        const a = items[i];
        const searchable = [a && a.name, a && a.player, a && a.id, a && a.levelID, a && a.submitter, (a && a.tags) ? (a.tags.join(' ')) : '']
          .filter(Boolean).join(' ').toLowerCase();
        idx[i] = { achievement: a, searchable };
        const toks = (searchable || '').split(/\s+/).filter(Boolean);
        toks.forEach(tok => {
          const capped = String(tok).slice(0, maxPrefix);
          for (let p = 1; p <= capped.length; p++) {
            const key = capped.slice(0, p);
            const arr = prefixMap.get(key) || [];
            arr.push(i);
            if (!prefixMap.has(key)) prefixMap.set(key, arr);
          }
        });
      }
      try { if (sig) _pasteIndexCache.set(sig, { idx, prefixMap }); } catch (e) { }
      pasteIndexRef.current = idx;
      pastePrefixMapRef.current = prefixMap;
    }
    if (!pasteIndexRef.current || !pasteIndexRef.current.length) {
      const cached = sig && _pasteIndexCache.has(sig) ? _pasteIndexCache.get(sig) : null;
      if (cached && cached.idx) {
        pasteIndexRef.current = cached.idx;
        pastePrefixMapRef.current = cached.prefixMap || new Map();
      }
    }
    setPasteIndex(pasteIndexRef.current || []);
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

  const newFormPreview = useMemo(() => {
    let tags = [...newFormTags];
    if (typeof newFormCustomTags === 'string' && newFormCustomTags.trim()) {
      newFormCustomTags.split(',').map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).forEach(t => {
        if (!tags.includes(t)) tags.push(t);
      });
    }
    const entry = {};
    Object.entries(newForm).forEach(([k, v]) => {
      if (k === 'version') {
        const num = Number(v);
        if (!isNaN(num)) entry[k] = num;
        return;
      }
      if (k === 'rank') {
        const num = Number(v);
        if (!isNaN(num)) entry[k] = num;
        return;
      }
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

  async function handleCopyJson() {
    const base = (stagedReordered && stagedReordered.length)
      ? stagedReordered
      : (reordered && reordered.length)
        ? reordered
        : devMode
          ? (devAchievements && devAchievements.length ? devAchievements : achievements)
          : achievements;

    if (!base || !base.length) return;

    const cleanse = v => {
      if (v === null) return;
      if (typeof v === 'string' && v.trim().toLowerCase() === 'null') return;
      if (Array.isArray(v)) {
        const a = [];
        for (let i = 0; i < v.length; i++) {
          const x = cleanse(v[i]);
          if (x !== undefined) a.push(x);
        }
        return a;
      }
      if (v && typeof v === 'object') {
        const o = {};
        for (const k in v) {
          const x = cleanse(v[k]);
          if (x !== undefined) o[k] = x;
        }
        return o;
      }
      return v;
    };

    let baseForCopy = base;
    try {
      if (devMode && dataFileName === 'pending.json') {
        baseForCopy = [...base].slice().sort((a, b) => {
          try {
            const da = parseAsLocal(a && a.date);
            const db = parseAsLocal(b && b.date);
            const ta = (da && !isNaN(da)) ? da.getTime() : 0;
            const tb = (db && !isNaN(db)) ? db.getTime() : 0;
            return tb - ta;
          } catch (e) {
            return 0;
          }
        });
      }
    } catch (e) { }

    const cleaned = baseForCopy.map(cleanse);

    try {
      if (devMode && dataFileName === 'pending.json') {
        for (let i = 0; i < cleaned.length; i++) {
          const it = cleaned[i];
          if (it && typeof it === 'object') {
            it.rank = Number(i + 1);
          }
        }
      }
    } catch (e) { }
    const json = JSON.stringify(cleaned, null, 2);

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(json);
        alert('Copied JSON to clipboard');
        return;
      } catch (e) {
      }
    }

    try {
      const t = document.createElement('textarea');
      t.value = json;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      alert('Copied JSON to clipboard');
    } catch (e) {
      alert('Clipboard API not available');
    }
  }

  async function handleDownloadJson() {
    const base = reordered && reordered.length
      ? reordered
      : devMode
        ? (devAchievements && devAchievements.length ? devAchievements : achievements)
        : achievements;

    if (!base || !base.length) return;

    const cleanse = v => {
      if (v === null) return;
      if (typeof v === 'string' && v.trim().toLowerCase() === 'null') return;
      if (Array.isArray(v)) {
        const a = [];
        for (let i = 0; i < v.length; i++) {
          const x = cleanse(v[i]);
          if (x !== undefined) a.push(x);
        }
        return a;
      }
      if (v && typeof v === 'object') {
        const o = {};
        for (const k in v) {
          const x = cleanse(v[k]);
          if (x !== undefined) o[k] = x;
        }
        return o;
      }
      return v;
    };

    const cleaned = base.map(cleanse);

    const fname = usePlatformers
      ? dataFileName === 'timeline.json'
        ? 'platformertimeline.json'
        : dataFileName === 'achievements.json'
          ? 'platformers.json'
          : dataFileName
      : dataFileName;

    const lower = (dataFileName || '').toLowerCase();
    const shouldMinify =
      (Array.isArray(cleaned) &&
        cleaned.length &&
        typeof cleaned[0] === 'object' &&
        (cleaned[0].id || cleaned[0].name) &&
        (cleaned[0].rank || cleaned[0].levelID)) ||
      (
        lower === 'achievements.json' ||
        lower === 'pending.json' ||
        lower === 'legacy.json' ||
        lower === 'platformers.json' ||
        lower === 'platformertimeline.json' ||
        lower === 'removed.json' ||
        lower === 'timeline.json'
      );

    const json = shouldMinify
      ? JSON.stringify(cleaned)
      : JSON.stringify(cleaned, null, 2);

    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`Saved ${fname} to disk (uncompressed JSON).`);
    } catch (e) {
      alert('Failed to save file locally');
    }
  }

  async function handleUploadJson() {
    const endpoint = (typeof window !== 'undefined' && window.__THAL_SAVE_ENDPOINT__) ? window.__THAL_SAVE_ENDPOINT__ : null;
    if (!endpoint) {
      alert('No save endpoint configured (window.__THAL_SAVE_ENDPOINT__)');
      return;
    }

    const base = reordered && reordered.length
      ? reordered
      : devMode
        ? (devAchievements && devAchievements.length ? devAchievements : achievements)
        : achievements;

    if (!base || !base.length) return;

    const cleanse = v => {
      if (v === null) return;
      if (typeof v === 'string' && v.trim().toLowerCase() === 'null') return;
      if (Array.isArray(v)) {
        const a = [];
        for (let i = 0; i < v.length; i++) {
          const x = cleanse(v[i]);
          if (x !== undefined) a.push(x);
        }
        return a;
      }
      if (v && typeof v === 'object') {
        const o = {};
        for (const k in v) {
          const x = cleanse(v[k]);
          if (x !== undefined) o[k] = x;
        }
        return o;
      }
      return v;
    };

    const cleaned = base.map(cleanse);
    const json = JSON.stringify(cleaned);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      });
      if (res.ok) alert('Uploaded JSON to server successfully');
      else alert(`Upload failed: ${res.status} ${res.statusText}`);
    } catch (e) {
      console.error('Upload failed', e);
      alert('Upload failed');
    }
  }

  function z85Encode(bytes) {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
    let out = '';
    let i = 0;
    const pad = (4 - (bytes.length % 4)) % 4;
    const arr = new Uint8Array(bytes.length + pad);
    arr.set(bytes, 0);
    while (i < arr.length) {
      const a = (arr[i++] << 24) >>> 0;
      const b = (arr[i++] << 16) >>> 0;
      const c = (arr[i++] << 8) >>> 0;
      const d = (arr[i++]) >>> 0;
      const value = (a | b | c | d) >>> 0;
      let div = value;
      const block = new Array(5);
      for (let k = 4; k >= 0; k--) {
        block[k] = alphabet[div % 85];
        div = Math.floor(div / 85);
      }
      out += block.join('');
    }
    return out;
  }

  function z85Decode(str) {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
    const map = {};
    for (let i = 0; i < alphabet.length; i++) map[alphabet[i]] = i;
    const out = [];
    let i = 0;
    while (i < str.length) {
      let value = 0;
      for (let k = 0; k < 5; k++) {
        const ch = str.charAt(i++);
        const v = map[ch];
        if (v === undefined) throw new Error('Invalid Z85 char');
        value = value * 85 + v;
      }
      out.push((value >>> 24) & 0xFF);
      out.push((value >>> 16) & 0xFF);
      out.push((value >>> 8) & 0xFF);
      out.push(value & 0xFF);
    }
    return new Uint8Array(out);
  }

  async function handleCopyCompressedJson() {
    const base = reordered && reordered.length
      ? reordered
      : devMode
        ? (devAchievements && devAchievements.length ? devAchievements : achievements)
        : achievements;

    if (!base || !base.length) return;

    const cleanse = v => {
      if (v === null) return;
      if (typeof v === 'string' && v.trim().toLowerCase() === 'null') return;
      if (Array.isArray(v)) {
        const a = [];
        for (let i = 0; i < v.length; i++) {
          const x = cleanse(v[i]);
          if (x !== undefined) a.push(x);
        }
        return a;
      }
      if (v && typeof v === 'object') {
        const o = {};
        for (const k in v) {
          const x = cleanse(v[k]);
          if (x !== undefined) o[k] = x;
        }
        return o;
      }
      return v;
    };

    const cleaned = base.map(cleanse);
    const lower = (dataFileName || '').toLowerCase();
    const shouldMinify =
      (Array.isArray(cleaned) &&
        cleaned.length &&
        typeof cleaned[0] === 'object' &&
        (cleaned[0].id || cleaned[0].name) &&
        (cleaned[0].rank || cleaned[0].levelID)) ||
      (
        lower === 'achievements.json' ||
        lower === 'pending.json' ||
        lower === 'legacy.json' ||
        lower === 'platformers.json' ||
        lower === 'platformertimeline.json' ||
        lower === 'removed.json' ||
        lower === 'timeline.json'
      );

    const json = shouldMinify ? JSON.stringify(cleaned) : JSON.stringify(cleaned, null, 2);

    try {
      if (typeof CompressionStream === 'undefined') throw new Error('CompressionStream not available');
      const encoder = new TextEncoder();
      const rs = new ReadableStream({ start(ctrl) { ctrl.enqueue(encoder.encode(json)); ctrl.close(); } });
      const cs = rs.pipeThrough(new CompressionStream('gzip'));
      const reader = cs.getReader();
      const chunks = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.length;
      }
      const out = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) { out.set(c, offset); offset += c.length; }

      const encoded = z85Encode(out);
      const payload = `Z85|gzip|${out.length}|${encoded}`;
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(payload);
          alert('Copied compressed JSON (Z85|gzip) to clipboard');
          return;
        }
      } catch (e) {
      }
      try {
        const t = document.createElement('textarea');
        t.value = payload;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
        alert('Copied compressed JSON (Z85|gzip) to clipboard');
        return;
      } catch (e) {
        alert('Failed to copy compressed payload to clipboard');
      }
    } catch (e) {
      alert('Compression not supported in this browser');
    }
  }

  async function handlePasteCompressedJson() {
    const payload = prompt('Paste compressed payload (Z85|alg|len|data)');
    if (!payload) return;
    const parts = payload.split('|');
    if (!parts || parts.length < 4 || parts[0] !== 'Z85') {
      alert('Invalid payload format');
      return;
    }
    const alg = parts[1] || 'gzip';
    const data = parts.slice(3).join('|');
    let compressed;
    try {
      compressed = z85Decode(data);
    } catch (err) {
      alert('Invalid Z85 payload');
      return;
    }

    try {
      if (typeof DecompressionStream === 'undefined') throw new Error('DecompressionStream not available');
      const ds = new DecompressionStream(alg);
      const stream = new Response(compressed).body.pipeThrough(ds);
      const reader = stream.getReader();
      const chunks = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.length;
      }
      const out = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) { out.set(c, offset); offset += c.length; }
      const text = new TextDecoder().decode(out);
      const json = JSON.parse(text);
      onImportAchievementsJson(json);
    } catch (err) {
      alert('Failed to decompress/import compressed payload');
    }
  }

  const { getMostVisibleIdx } = useScrollPersistence({
    storageKey: `thal_scroll_index_${storageKeySuffix}`,
    items: achievements,
    devMode,
    listRef,
    itemRefs: achievementRefs,
    setScrollToIdx,
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
    const realIdx = resolveRealIdx(idx);
    batchUpdateReordered(arr => {
      if (!arr) return arr;
      arr.splice(realIdx, 1);
      return arr;
    });
  }

  function handleDuplicateAchievement(idx) {
    const realIdx = resolveRealIdx(idx);
    const orig = (stagedRef.current && stagedRef.current[realIdx]) || (reorderedRef.current && reorderedRef.current[realIdx]) || {};
    const copy = { ...orig, id: (((orig && orig.id) ? orig.id : `item-${realIdx}`) + '-copy') };
    const enhancedCopy = enhanceAchievement(copy);
    if (stagedRef.current) {
      setStagedReordered(prev => {
        const arr = Array.isArray(prev) ? prev.slice() : [];
        arr.splice(realIdx + 1, 0, enhancedCopy);
        arr.forEach((a, i) => { if (a) a.rank = i + 1; });
        return arr;
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

  function commitStaged() {
    try {
      if (!stagedRef.current || !Array.isArray(stagedRef.current)) return;
      const copy = stagedRef.current.map(a => ({ ...(a || {}) }));
      setReordered(copy);
      setStagedReordered(null);
    } catch (e) { }
  }

  function cancelStaged() {
    try {
      setStagedReordered(null);
    } catch (e) { }
  }

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
    imported = imported.map((a, i) => enhanceAchievement({ ...a, rank: i + 1 }));
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

  const devPanelHandlersRef = useRef({});
  useEffect(() => {
    devPanelHandlersRef.current = {
      handleCheckDuplicateThumbnails,
      getPasteCandidates,
      handlePasteSelect,
      handleEditFormChange,
      handleEditFormTagClick,
      handleEditFormCustomTagsChange,
      handleEditFormSave,
      handleEditFormCancel,
      handleNewFormChange,
      handleNewFormTagClick,
      handleNewFormCustomTagsChange,
      handleNewFormAdd,
      handleNewFormCancel,
      handleCopyJson,
      handleCopyCompressedJson,
      handlePasteCompressedJson,
      handleDownloadJson,
      handleUploadJson,
      handleShowNewForm,
      generateAndCopyChangelog,
      commitStaged,
      cancelStaged,
      resetChanges,
      onImportAchievementsJson,
    };
  });

  const handleCheckDuplicateThumbnailsCb = useCallback((...args) => devPanelHandlersRef.current.handleCheckDuplicateThumbnails && devPanelHandlersRef.current.handleCheckDuplicateThumbnails(...args), []);
  const getPasteCandidatesCb = useCallback((...args) => devPanelHandlersRef.current.getPasteCandidates && devPanelHandlersRef.current.getPasteCandidates(...args), []);
  const handlePasteSelectCb = useCallback((...args) => devPanelHandlersRef.current.handlePasteSelect && devPanelHandlersRef.current.handlePasteSelect(...args), []);
  const handleEditFormChangeCb = useCallback((...args) => devPanelHandlersRef.current.handleEditFormChange && devPanelHandlersRef.current.handleEditFormChange(...args), []);
  const handleEditFormTagClickCb = useCallback((...args) => devPanelHandlersRef.current.handleEditFormTagClick && devPanelHandlersRef.current.handleEditFormTagClick(...args), []);
  const handleEditFormCustomTagsChangeCb = useCallback((...args) => devPanelHandlersRef.current.handleEditFormCustomTagsChange && devPanelHandlersRef.current.handleEditFormCustomTagsChange(...args), []);
  const handleEditFormSaveCb = useCallback((...args) => devPanelHandlersRef.current.handleEditFormSave && devPanelHandlersRef.current.handleEditFormSave(...args), []);
  const handleEditFormCancelCb = useCallback((...args) => devPanelHandlersRef.current.handleEditFormCancel && devPanelHandlersRef.current.handleEditFormCancel(...args), []);
  const handleNewFormChangeCb = useCallback((...args) => devPanelHandlersRef.current.handleNewFormChange && devPanelHandlersRef.current.handleNewFormChange(...args), []);
  const handleNewFormTagClickCb = useCallback((...args) => devPanelHandlersRef.current.handleNewFormTagClick && devPanelHandlersRef.current.handleNewFormTagClick(...args), []);
  const handleNewFormCustomTagsChangeCb = useCallback((...args) => devPanelHandlersRef.current.handleNewFormCustomTagsChange && devPanelHandlersRef.current.handleNewFormCustomTagsChange(...args), []);
  const handleNewFormAddCb = useCallback((...args) => devPanelHandlersRef.current.handleNewFormAdd && devPanelHandlersRef.current.handleNewFormAdd(...args), []);
  const handleNewFormCancelCb = useCallback((...args) => devPanelHandlersRef.current.handleNewFormCancel && devPanelHandlersRef.current.handleNewFormCancel(...args), []);
  const handleCopyJsonCb = useCallback((...args) => devPanelHandlersRef.current.handleCopyJson && devPanelHandlersRef.current.handleCopyJson(...args), []);
  const handleCopyCompressedCb = useCallback((...args) => devPanelHandlersRef.current.handleCopyCompressedJson && devPanelHandlersRef.current.handleCopyCompressedJson(...args), []);
  const handlePasteCompressedCb = useCallback((...args) => devPanelHandlersRef.current.handlePasteCompressedJson && devPanelHandlersRef.current.handlePasteCompressedJson(...args), []);
  const handleDownloadJsonCb = useCallback((...args) => devPanelHandlersRef.current.handleDownloadJson && devPanelHandlersRef.current.handleDownloadJson(...args), []);
  const handleUploadJsonCb = useCallback((...args) => devPanelHandlersRef.current.handleUploadJson && devPanelHandlersRef.current.handleUploadJson(...args), []);
  const handleShowNewFormCb = useCallback((...args) => devPanelHandlersRef.current.handleShowNewForm && devPanelHandlersRef.current.handleShowNewForm(...args), []);
  const generateAndCopyChangelogCb = useCallback((...args) => devPanelHandlersRef.current.generateAndCopyChangelog && devPanelHandlersRef.current.generateAndCopyChangelog(...args), []);
  const resetChangesCb = useCallback((...args) => devPanelHandlersRef.current.resetChanges && devPanelHandlersRef.current.resetChanges(...args), []);
  const onImportAchievementsJsonCb = useCallback((...args) => devPanelHandlersRef.current.onImportAchievementsJson && devPanelHandlersRef.current.onImportAchievementsJson(...args), []);

  const stableDevPanelProps = useMemo(() => ({
    handleCheckDuplicateThumbnails: handleCheckDuplicateThumbnailsCb,
    getPasteCandidates: getPasteCandidatesCb,
    handlePasteSelect: handlePasteSelectCb,
    handleEditFormChange: handleEditFormChangeCb,
    handleEditFormTagClick: handleEditFormTagClickCb,
    handleEditFormCustomTagsChange: handleEditFormCustomTagsChangeCb,
    handleEditFormSave: handleEditFormSaveCb,
    handleEditFormCancel: handleEditFormCancelCb,
    handleNewFormChange: handleNewFormChangeCb,
    handleNewFormTagClick: handleNewFormTagClickCb,
    handleNewFormCustomTagsChange: handleNewFormCustomTagsChangeCb,
    handleNewFormAdd: handleNewFormAddCb,
    handleNewFormCancel: handleNewFormCancelCb,
    handleCopyJson: handleCopyJsonCb,
    handleCopyCompressedJson: handleCopyCompressedCb,
    handlePasteCompressedJson: handlePasteCompressedCb,
    handleShowNewForm: handleShowNewFormCb,
    generateAndCopyChangelog: generateAndCopyChangelogCb,
    resetChanges: resetChangesCb,
    onImportAchievementsJson: onImportAchievementsJsonCb,
  }), [
    handleCheckDuplicateThumbnailsCb, getPasteCandidatesCb, handlePasteSelectCb, handleEditFormChangeCb,
    handleEditFormTagClickCb, handleEditFormCustomTagsChangeCb, handleEditFormSaveCb, handleEditFormCancelCb,
    handleNewFormChangeCb, handleNewFormTagClickCb, handleNewFormCustomTagsChangeCb, handleNewFormAddCb,
    handleNewFormCancelCb, handleCopyJsonCb, handleShowNewFormCb, generateAndCopyChangelogCb,
    resetChangesCb, onImportAchievementsJsonCb, handleDownloadJsonCb, handleUploadJsonCb,
  ]);



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
            {...stableDevPanelProps}
            editIdx={editIdx}
            editForm={editForm}
            editFormTags={editFormTags}
            editFormCustomTags={editFormCustomTags}
            pasteSearch={pasteSearch}
            setPasteSearch={setPasteSearch}
            pasteShowResults={pasteShowResults}
            setPasteShowResults={setPasteShowResults}
            AVAILABLE_TAGS={AVAILABLE_TAGS}
            showNewForm={showNewForm}
            newForm={newForm}
            newFormTags={newFormTags}
            newFormCustomTags={newFormCustomTags}
            newFormPreview={newFormPreview}
            dataFileName={usePlatformers ? (dataFileName.includes('timeline') ? 'platformertimeline.json' : 'platformers.json') : dataFileName}
          />
          {isPending ? (
            <div className="no-achievements">Loading...</div>
          ) : (
            (visibleList && visibleList.length === 0) ? (
              <div className="no-achievements">No achievements found.</div>
            ) : (
              <ListWindow
                ref={listRef}
                height={Math.min(720, (typeof window !== 'undefined' ? window.innerHeight - 200 : 720))}
                itemCount={Math.min(visibleCount, (visibleList || []).length)}
                itemSize={150}
                overscanCount={(typeof window !== 'undefined' && window.innerWidth <= 480) ? 20 : 8}
                width={'100%'}
                style={{ overflowX: 'hidden' }}
                itemData={listItemData}
                onItemsRendered={({ visibleStopIndex }) => {
                  try {
                    const v = typeof window !== 'undefined' ? localStorage.getItem('itemsPerPage') : null;
                    const pageSize = v === 'all' ? 'all' : (v ? Number(v) || 100 : 100);
                    if (pageSize === 'all') return;
                    if (visibleStopIndex >= Math.min(visibleCount, (visibleList || []).length) - 5 && visibleCount < (visibleList || []).length) {
                      setVisibleCount(prev => Math.min(prev + (Number(pageSize) || 100), (visibleList || []).length));
                    }
                  } catch (err) {
                    if (visibleStopIndex >= Math.min(visibleCount, (visibleList || []).length) - 5 && visibleCount < (visibleList || []).length) {
                      setVisibleCount(prev => Math.min(prev + 100, (visibleList || []).length));
                    }
                  }
                }}
              >
                {ListRow}
              </ListWindow>
            )
          )}
        </section>
      </main>
      {devMode && (
        <div ref={devPanelRef} className="devmode-hover-panel" style={{ display: 'none', position: 'absolute', left: -9999, top: -9999, width: 360, maxHeight: '60vh', overflow: 'auto', background: 'var(--secondary-bg, #1a1a1a)', color: 'var(--text-color, #fff)', padding: 12, borderRadius: 8, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-edit" title="Edit" aria-label="Edit" onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; handleEditAchievement(i); } catch (e) { } }}>
                <EditIcon width={16} height={16} />
              </button>
              <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-move-up" title="Move Up" aria-label="Move Up" onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; handleMoveAchievementUp(i); } catch (e) { } }}>
                <UpIcon width={16} height={16} />
              </button>
              <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-move-down" title="Move Down" aria-label="Move Down" onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; handleMoveAchievementDown(i); } catch (e) { } }}>
                <DownIcon width={16} height={16} />
              </button>
              <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-duplicate" title="Duplicate" aria-label="Duplicate" onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; handleDuplicateAchievement(i); } catch (e) { } }}>
                <AddIcon width={16} height={16} />
              </button>
              <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-delete" title="Delete" aria-label="Delete" onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); const i = hoveredIdxRef.current; if (i == null) return; handleRemoveAchievement(i); } catch (e) { } }} style={{ background: '#dc3545', color: '#fff', borderColor: 'rgba(220,53,69,0.9)' }}>
                <DeleteIcon width={16} height={16} />
              </button>
              <button type="button" className="devmode-btn devmode-hover-btn devmode-btn-copy" title="Copy JSON" aria-label="Copy JSON" onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); handleCopyItemJson(); } catch (e) { } }}>
                <CopyIcon width={16} height={16} />
              </button>
            </div>
          </div>
        </div>
      )}

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
}

const TagFilterPills = React.memo(TagFilterPillsInner, (prev, next) => {
  return prev.allTags === next.allTags && prev.filterTags === next.filterTags && prev.isMobile === next.isMobile && prev.show === next.show;
});
