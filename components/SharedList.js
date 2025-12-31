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

function getAchievementContext(achievement, allAchievements, index) {
  const below = index > 0 ? allAchievements[index - 1]?.name : null;
  const above = index < allAchievements.length - 1 ? allAchievements[index + 1]?.name : null;
  return { below, above };
}

function formatChangelogEntry(change, achievements, mode) {
  const { type, achievement, oldAchievement, oldRank, newRank, removedDuplicates, readdedAchievements, oldIndex, newIndex } = change;

  if (!achievement) return '';

  const name = achievement.name || 'Unknown';
  const rank = achievement.rank || '?';
  const allAchievements = achievements || [];
  const newIdx = allAchievements.findIndex(a => a.id === achievement.id);
  const context = newIdx >= 0 ? getAchievementContext(achievement, allAchievements, newIdx) : { below: null, above: null };

  const showOnlyOneContext = mode === 'dev';

  let entry = '';

  switch (type) {
    case 'added':
      entry = `🟢 **${name}** added at #${rank}`;
      if (showOnlyOneContext) {
        if (context.below) entry += `\n> Below ${context.below}`;
      } else {
        if (context.below) entry += `\n> Below ${context.below}`;
        if (context.above) entry += `\n> Above ${context.above}`;
      }
      break;

    case 'removed':
      entry = `🔴 **${name}** removed from #${oldRank || rank}`;
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
          entry += `\n> 🔴 ${dup.name} (#${dup.rank})`;
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
          entry += `\n> 🟢 ${re.name} (#${re.rank})`;
        });
      }
      break;

    case 'timelineAdded':
      entry = `🟡 **${name}** added to the Timeline at ${achievement.date || 'Unknown date'}`;
      break;

    case 'timelineRemoved':
      entry = `<:timelineremove:1375894648383606945> **${name}** removed from the Timeline at ${achievement.date || 'Unknown date'}`;
      break;
  }

  return entry;
}

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

const TIERS = [
  { name: 'Tier I', subtitle: 'Endgame', percent: 4, gradientStart: '#FFD700', gradientEnd: '#FF8C00' },
  { name: 'Tier II', subtitle: 'Master', percent: 6, gradientStart: '#E8E8E8', gradientEnd: '#999999' },
  { name: 'Tier III', subtitle: 'Expert', percent: 8, gradientStart: '#D4AF37', gradientEnd: '#8B6914' },
  { name: 'Tier IV', subtitle: 'Advanced', percent: 12, gradientStart: '#FF5555', gradientEnd: '#BB0000' },
  { name: 'Tier V', subtitle: 'Intermediate', percent: 16, gradientStart: '#5B9BF5', gradientEnd: '#1E40AF' },
  { name: 'Tier VI', subtitle: 'Developing', percent: 24, gradientStart: '#65C641', gradientEnd: '#0D7F2F' },
  { name: 'Tier VII', subtitle: 'Entry', percent: 30, gradientStart: '#B955F7', gradientEnd: '#6B21A8' },
];

function hasRatedAndVerified(item) {
  if (!item) return false;

  if (item.rated === true && item.verified === true) return true;

  const collect = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'object') return [JSON.stringify(val)];
    return [String(val)];
  };

  const tags = [];
  tags.push(...collect(item.tags));
  tags.push(...collect(item.tag));
  tags.push(...collect(item.labels));
  tags.push(...collect(item.label));
  tags.push(...collect(item.status));
  tags.push(...collect(item.meta));
  if (item.achievement && typeof item.achievement === 'object') {
    tags.push(...collect(item.achievement.tags));
    tags.push(...collect(item.achievement.label));
    tags.push(...collect(item.achievement.status));
  }

  const lower = tags.map(t => String(t).toLowerCase());
  if (lower.includes('rated') && lower.includes('verified')) return true;

  try {
    const s = JSON.stringify(item).toLowerCase();
    return s.includes('rated') && s.includes('verified');
  } catch (e) {
    return false;
  }
}

function getTierByRank(rank, totalAchievements, achievements = []) {
  if (!rank || !totalAchievements || rank <= 0) return null;

  const sizes = TIERS.map(t => Math.floor(totalAchievements * (t.percent / 100)));
  let allocated = sizes.reduce((a, b) => a + b, 0);
  let remainingToAllocate = totalAchievements - allocated;
  let idx = 0;
  while (remainingToAllocate > 0 && TIERS.length > 0) {
    sizes[idx % sizes.length] += 1;
    remainingToAllocate -= 1;
    idx += 1;
  }

  let start = 1;
  for (let i = 0; i < TIERS.length; i++) {
    const size = sizes[i];
    const targetLastIndex = Math.min(totalAchievements - 1, start + size - 1);

    let foundIndex = -1;
    const maxOffset = Math.max(targetLastIndex - start, totalAchievements - 1 - targetLastIndex);
    for (let offset = 0; offset <= maxOffset; offset++) {
      const forward = targetLastIndex + offset;
      if (forward < totalAchievements && forward >= start - 1 && hasRatedAndVerified(achievements[forward])) {
        foundIndex = forward;
        break;
      }
      const backward = targetLastIndex - offset;
      if (backward >= start - 1 && backward < totalAchievements && hasRatedAndVerified(achievements[backward])) {
        foundIndex = backward;
        break;
      }
    }

    let endRank;
    if (foundIndex >= 0) {
      endRank = foundIndex + 1;
    } else {
      endRank = Math.min(totalAchievements, start + size - 1);
    }

    if (rank >= start && rank <= endRank) {
      return TIERS[i];
    }

    start = endRank + 1;
  }

  return null;
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
  if (achievement && achievement.thumbnail) {
    return achievement.thumbnail;
  }
  if (achievement && achievement.levelID) {
    const baseUrl = `https://levelthumbs.prevter.me/thumbnail/${achievement.levelID}`;
    return isMobile ? `${baseUrl}/small` : baseUrl;
  }
  return '/assets/default-thumbnail.png';
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

function TimelineAchievementCardInner({ achievement, previousAchievement, onEdit, onHoverEnter, onHoverLeave, isHovered, devMode, autoThumbAvailable }) {
  const { dateFormat } = useDateFormat();
  const tier = getTierByRank(achievement.rank, totalAchievements, achievements);
  const isPlatformer = (achievement && Array.isArray(achievement.tags)) ? achievement.tags.some(t => String(t).toLowerCase() === 'platformer') : false;
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
            {!isPlatformer && (
              <div className="achievement-length">
                {achievement.length ? `${Math.floor(achievement.length / 60)}:${(achievement.length % 60).toString().padStart(2, '0')}` : 'N/A'}
              </div>
            )}
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
              <img src={sanitizeImageUrl(achievement.thumbnail) || getThumbnailUrl(achievement, false)} alt={achievement.name} loading="lazy" />
              {autoThumbAvailable && (
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>Automatic thumbnail applied</div>
              )}
            </div>
          </div>
          { }
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

const TimelineAchievementCard = memo(TimelineAchievementCardInner, (prev, next) => prev.achievement === next.achievement && prev.devMode === next.devMode && prev.autoThumbAvailable === next.autoThumbAvailable);

const AchievementCard = memo(function AchievementCard({ achievement, devMode, autoThumbAvailable, displayRank, showRank = true, totalAchievements, achievements = [], mode = '', usePlatformers = false }) {
  const { dateFormat } = useDateFormat();
  const isPlatformer = (achievement && Array.isArray(achievement.tags)) ? achievement.tags.some(t => String(t).toLowerCase() === 'platformer') : false;
  const tier = getTierByRank(achievement.rank, totalAchievements, achievements);

  const getBaselineForTier = (tierObj) => {
    if (!tierObj || !achievements.length) return null;
    const sizes = TIERS.map(t => Math.floor(totalAchievements * (t.percent / 100)));
    let allocated = sizes.reduce((a, b) => a + b, 0);
    let remainingToAllocate = totalAchievements - allocated;
    let idx = 0;
    while (remainingToAllocate > 0 && TIERS.length > 0) {
      sizes[idx % sizes.length] += 1;
      remainingToAllocate -= 1;
      idx += 1;
    }

    let start = 1;
    for (let i = 0; i < TIERS.length; i++) {
      const size = sizes[i];
      const tierStartIdx = start - 1;
      const tierEndIdx = Math.min(totalAchievements - 1, start + size - 1);
      if (TIERS[i].name === tierObj.name && TIERS[i].subtitle === tierObj.subtitle) {
        let foundIndex = -1;
        const maxOffset = Math.max(tierEndIdx - tierStartIdx, totalAchievements - 1 - tierEndIdx);
        for (let offset = 0; offset <= maxOffset; offset++) {
          const forward = tierEndIdx + offset;
          if (forward < totalAchievements && forward >= tierStartIdx && hasRatedAndVerified(achievements[forward])) {
            foundIndex = forward;
            break;
          }
          const backward = tierEndIdx - offset;
          if (backward >= tierStartIdx && backward < totalAchievements && hasRatedAndVerified(achievements[backward])) {
            foundIndex = backward;
            break;
          }
        }
        if (foundIndex >= 0 && foundIndex < achievements.length) {
          return achievements[foundIndex]?.name || 'Unknown';
        }
        if (tierEndIdx >= tierStartIdx && tierEndIdx < achievements.length) {
          return achievements[tierEndIdx]?.name || 'Unknown';
        }
        return null;
      }
      start = start + size;
    }
    return null;
  };

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
          pointerEvents: devMode ? 'none' : 'auto',
          opacity: devMode ? 0.5 : 1,
          transition: 'opacity 0.1s',
        }}
        onClick={handleClick}
        onMouseDown={handleClick}
        tabIndex={devMode ? -1 : 0}
        aria-disabled={devMode ? 'true' : undefined}
      >
        <div
          className="achievement-item"
          tabIndex={0}
          style={{ cursor: devMode ? 'not-allowed' : 'pointer', pointerEvents: devMode ? 'none' : 'auto', opacity: devMode ? 0.5 : 1, transition: 'opacity 0.1s' }}
        >
          <div className="rank-date-container">
            {!isPlatformer && (
              <div className="achievement-length">
                {achievement.length ? `${Math.floor(achievement.length / 60)}:${(achievement.length % 60).toString().padStart(2, '0')}` : 'N/A'}
              </div>
            )}
            <div className="achievement-date">
              {achievement.date ? formatDate(achievement.date, dateFormat) : 'N/A'}
            </div>
            {showRank && (
              <div className="rank"><strong>#{displayRank != null ? displayRank : achievement.rank}</strong></div>
            )}
            {tier && mode !== 'timeline' && !usePlatformers && showTiers === true && (
              <div 
                className="tier-tag"
                style={{
                  '--tier-gradient-start': tier.gradientStart,
                  '--tier-gradient-end': tier.gradientEnd,
                }}
                title={`${tier.name} – ${tier.subtitle}\n${tier.percent}% of achievements\nBaseline is ${getBaselineForTier(tier) || 'Unknown'}`}
              >
                <span className="tier-tag-text">{tier.name} – {tier.subtitle}</span>
              </div>
            )}
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
              <img src={sanitizeImageUrl(achievement.thumbnail) || getThumbnailUrl(achievement, false)} alt={achievement.name} loading="lazy" />
              {autoThumbAvailable && (
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>Automatic thumbnail applied</div>
              )}
            </div>
          </div>
        </div>
      </a>
    </Link>
  );
}, (prev, next) => prev.achievement === next.achievement && prev.devMode === next.devMode && prev.autoThumbAvailable === next.autoThumbAvailable && prev.displayRank === next.displayRank && prev.showRank === next.showRank && prev.totalAchievements === next.totalAchievements && prev.achievements === next.achievements && prev.mode === next.mode && prev.usePlatformers === next.usePlatformers);

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
  mode = '',
  showPlatformToggle = true,
  rankOffset = 0,
  showTiers = false,
}) {
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

    if (query === 'edit') {
      setDevMode(true);
      if (!reordered) setReordered(achievements.map(a => ({ ...a })));
      setSearch('');
      if (document && document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      return;
    }

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

  const hideRank = storageKeySuffix === 'pending' || dataFileName === 'pending.json';

  const [originalAchievements, setOriginalAchievements] = useState(null);
  const [sortKey, setSortKey] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem(`thal_sort_key_${storageKeySuffix}`);
        if (v) return v;
      }
    } catch (e) { }
    return storageKeySuffix === 'pending' ? 'date' : 'rank';
  });

  const [sortDir, setSortDir] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem(`thal_sort_dir_${storageKeySuffix}`);
        if (v) return v;
      }
    } catch (e) { }
    return storageKeySuffix === 'pending' ? 'desc' : 'asc';
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

  const [randomOrderMap, setRandomOrderMap] = useState({});

  const [reordered, setReordered] = useState(null);
  const [bgImage, setBgImage] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [duplicateThumbKeys, setDuplicateThumbKeys] = useState(new Set());
  const [autoThumbMap, setAutoThumbMap] = useState({});
  const [newForm, setNewForm] = useState({
    name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: []
  });
  const [newFormTags, setNewFormTags] = useState([]);
  const [newFormCustomTags, setNewFormCustomTags] = useState('');
  const [pasteSearch, setPasteSearch] = useState('');
  const [pasteShowResults, setPasteShowResults] = useState(false);
  const [pasteIndex, setPasteIndex] = useState([]);
  const debouncedPasteSearch = useDebouncedValue(pasteSearch, 200);
  const [extraLists, setExtraLists] = useState({});
  const EXTRA_FILES = ['pending.json', 'legacy.json', 'platformers.json', 'platformertimeline.json', 'timeline.json', 'removed.json'];
  const [insertIdx, setInsertIdx] = useState(null);
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editFormTags, setEditFormTags] = useState([]);
  const [editFormCustomTags, setEditFormCustomTags] = useState('');
  const achievementRefs = useRef([]);

  function resolveRealIdx(displayIdx) {
    try {
      if (!reordered || !Array.isArray(reordered) || reordered.length === 0) return displayIdx;
      if (reordered[displayIdx] && devAchievements && devAchievements[displayIdx] && reordered[displayIdx].id && devAchievements[displayIdx].id && reordered[displayIdx].id === devAchievements[displayIdx].id) {
        return displayIdx;
      }
      if (reordered[displayIdx] && (!devAchievements || !devAchievements.length || devAchievements.findIndex(x => x && x.id ? x.id === reordered[displayIdx].id : false) === -1)) {
        return displayIdx;
      }
      const displayed = (devAchievements && devAchievements.length) ? devAchievements[displayIdx] : null;
      if (!displayed) return displayIdx;
      if (displayed.id) {
        const real = reordered.findIndex(x => x && x.id ? x.id === displayed.id : false);
        return real === -1 ? displayIdx : real;
      }
      const realByObj = reordered.findIndex(x => x === displayed);
      return realByObj === -1 ? displayIdx : realByObj;
    } catch (e) {
      return displayIdx;
    }
  }

  function handleMoveAchievementUp(idx) {
    const realIdx = resolveRealIdx(idx);
    setReordered(prev => {
      if (!prev || realIdx <= 0) return prev;
      const arr = [...prev];
      const temp = arr[realIdx - 1];
      arr[realIdx - 1] = arr[realIdx];
      arr[realIdx] = temp;
      arr.forEach((a, i) => { a.rank = i + 1; });

      if (devMode && arr[realIdx - 1]) {

      }

      return arr;
    });
  }

  function handleMoveAchievementDown(idx) {
    const realIdx = resolveRealIdx(idx);
    setReordered(prev => {
      if (!prev || realIdx >= prev.length - 1) return prev;
      const arr = [...prev];
      const temp = arr[realIdx + 1];
      arr[realIdx + 1] = arr[realIdx];
      arr[realIdx] = temp;
      arr.forEach((a, i) => { a.rank = i + 1; });

      if (devMode && arr[realIdx + 1]) {

      }

      return arr;
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

    setReordered(prev => {
      if (!prev) return prev;
      const arr = [...prev];
      const original = arr[editIdx];

      const newRank = entry && entry.rank !== undefined && entry.rank !== null && entry.rank !== '' ? Number(entry.rank) : null;
      const oldRank = original ? Number(original.rank) : null;
      const rankIsChanging = newRank !== null && !isNaN(newRank) && newRank !== oldRank;

      if (rankIsChanging) {
        const [removed] = arr.splice(editIdx, 1);
        const updated = { ...removed, ...entry };
        const idx = Math.max(0, Math.min(arr.length, newRank - 1));
        arr.splice(idx, 0, updated);
      } else {
        arr[editIdx] = { ...original, ...entry };
      }

      arr.forEach((a, i) => { if (a) a.rank = i + 1; });
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
    const current = (reordered && reordered.length) ? reordered : achievements || [];

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

    let formatted = finalChanges.map(c => formatChangelogEntry(c, baseList, mode)).filter(s => s && s.trim()).join('\n\n');

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
        const alt = chosen.map(c => formatChangelogEntry(c, baseList, mode)).filter(s => s && s.trim()).join('\n\n');
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
        const list = Array.isArray(data) ? data : (data.achievements || []);
        const valid = list.filter(a => a && typeof a.name === 'string' && a.name && a.id);
        if (dataFileName === 'pending.json') {
          setAchievements(valid);
          setOriginalAchievements(valid.map((a, i) => ({ ...a, rank: i + 1 })));
        } else {
          const withRank = valid.map((a, i) => ({ ...a, rank: i + 1 }));
          setAchievements(withRank);
          setOriginalAchievements(withRank.map(a => ({ ...a })));
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
      const thumb = (top.thumbnail && String(top.thumbnail).trim()) ? top.thumbnail : (top.levelID ? `https://levelthumbs.prevter.me/thumbnail/${top.levelID}` : null);
      setBgImage(thumb || null);
    } catch (e) {
      setBgImage(null);
    }
  }, [achievements, usePlatformers]);

  const router = useRouter();

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
      copy.sort((x, y) => ((randomOrderMap[getKey(x)] || 0) - (randomOrderMap[getKey(y)] || 0)));
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
      copy.sort((x, y) => ((randomOrderMap[getKey(x)] || 0) - (randomOrderMap[getKey(y)] || 0)));
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

    setReordered(prev => {
      let newArr;
      let insertedIdx = 0;
      if (!prev) {
        setScrollToIdx(0);
        newArr = [entry];
        insertedIdx = 0;
      } else if (entry && entry.rank !== undefined && entry.rank !== null && entry.rank !== '' && !isNaN(Number(entry.rank))) {
        const idx = Math.max(0, Math.min(prev.length, Number(entry.rank) - 1));
        newArr = [...prev];
        newArr.splice(idx, 0, entry);
        setScrollToIdx(idx);
        insertedIdx = idx;
      } else if (insertIdx === null || insertIdx < 0 || insertIdx > prev.length - 1) {
        setScrollToIdx(prev.length);
        newArr = [...prev, entry];
        insertedIdx = prev.length;
      } else {
        newArr = [...prev];
        newArr.splice(insertIdx + 1, 0, entry);
        setScrollToIdx(insertIdx + 1);
        insertedIdx = insertIdx + 1;
      }

      newArr.forEach((a, i) => { if (a) a.rank = i + 1; });

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

  function getPasteCandidates() {
    const q = (debouncedPasteSearch || '').trim().toLowerCase();
    if (!q) return [];

    if (!pasteIndex || pasteIndex.length === 0) {
      const base = (devMode && reordered) ? reordered || [] : achievements || [];
      const extras = Object.values(extraLists).flat().filter(Boolean);
      const items = [...base, ...extras];
      const idx = new Array(items.length);
      for (let i = 0; i < items.length; i++) {
        const a = items[i];
        idx[i] = {
          achievement: a,
          searchable: [a && a.name, a && a.player, a && a.id, a && a.levelID, a && a.submitter, (a && a.tags) ? (a.tags.join(' ')) : '']
            .filter(Boolean).join(' ').toLowerCase()
        };
      }
      setPasteIndex(idx);
    }

    const out = [];
    for (let i = 0; i < pasteIndex.length && out.length < 50; i++) {
      const entry = pasteIndex[i];
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
    const idx = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      idx[i] = {
        achievement: a,
        searchable: [a && a.name, a && a.player, a && a.id, a && a.levelID, a && a.submitter, (a && a.tags) ? (a.tags.join(' ')) : '']
          .filter(Boolean).join(' ').toLowerCase()
      };
    }
    setPasteIndex(idx);
  }, [achievements, extraLists, devMode, reordered]);

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

  function handleCopyJson() {
    const source = devMode
      ? ((reordered && reordered.length) ? reordered : (devAchievements && devAchievements.length ? devAchievements : achievements))
      : ((reordered && reordered.length) ? reordered : achievements);
    if (!source || !source.length) return;
    const json = JSON.stringify(source.map(r => ({ ...r })), null, 2);
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
    const realIdx = resolveRealIdx(idx);
    setReordered(prev => {
      if (!prev) return prev;
      const arr = [...prev];
      const removed = arr[realIdx];
      arr.splice(realIdx, 1);
      arr.forEach((a, i) => { if (a) a.rank = i + 1; });

      return arr;
    });
  }

  function handleDuplicateAchievement(idx) {
    const realIdx = resolveRealIdx(idx);
    setReordered(prev => {
      if (!prev) return prev;
      const arr = [...prev];
      const copy = { ...arr[realIdx], id: (arr[realIdx] && arr[realIdx].id ? arr[realIdx].id : `item-${realIdx}`) + '-copy' };
      arr.splice(realIdx + 1, 0, copy);

      arr.forEach((a, i) => { if (a) a.rank = i + 1; });
      setScrollToIdx(realIdx + 1);
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
                    try { localStorage.setItem('sortKey', v); } catch (err) { }
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
                    try { localStorage.setItem('sortDir', next); } catch (err) { }
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
          <div style={{ width: '100%' }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: 'min(95vw, 902px)', margin: '0 auto' }}>
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
          </div>

          <DevModePanel
            devMode={devMode}
            handleCheckDuplicateThumbnails={handleCheckDuplicateThumbnails}
            editIdx={editIdx}
            editForm={editForm}
            editFormTags={editFormTags}
            editFormCustomTags={editFormCustomTags}
            pasteSearch={pasteSearch}
            setPasteSearch={setPasteSearch}
            pasteShowResults={pasteShowResults}
            setPasteShowResults={setPasteShowResults}
            getPasteCandidates={getPasteCandidates}
            handlePasteSelect={handlePasteSelect}
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
            generateAndCopyChangelog={generateAndCopyChangelog}
            resetChanges={resetChanges}
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
                  const thumb = getThumbnailUrl(a, isMobile);
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
                  {mode === 'timeline' ?
                    <TimelineAchievementCard achievement={a} previousAchievement={devAchievements[i - 1]} onEdit={() => handleEditAchievement(i)} isHovered={hoveredIdx === i} devMode={devMode} autoThumbAvailable={a && a.levelID ? !!autoThumbMap[String(a.levelID)] : false} />
                    :
                    (() => {
                      const computed = (a && (Number(a.rank) || a.rank)) ? Number(a.rank) : (i + 1);
                      const displayRank = Number.isFinite(Number(computed)) ? Number(computed) + (Number(rankOffset) || 0) : computed;
                      return <AchievementCard achievement={a} devMode={devMode} autoThumbAvailable={a && a.levelID ? !!autoThumbMap[String(a.levelID)] : false} displayRank={displayRank} showRank={!hideRank} totalAchievements={devAchievements.length} achievements={devAchievements} mode={mode} usePlatformers={usePlatformers} showTiers={showTiers === true} />;
                    })()
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
                  const thumb = getThumbnailUrl(a, isMobile);
                  const isDup = duplicateThumbKeys.has((thumb || '').trim());
                  return (
                    <div data-index={index} style={itemStyle} key={a.id || index} className={`${isDup ? 'duplicate-thumb-item' : ''} ${highlightedIdx === index ? 'search-highlight' : ''}`}>
                      {mode === 'timeline' ?
                        <TimelineAchievementCard achievement={a} previousAchievement={index > 0 ? filtered[index - 1] : null} onEdit={null} isHovered={false} devMode={devMode} autoThumbAvailable={a && a.levelID ? !!autoThumbMap[String(a.levelID)] : false} />
                        :
                        (() => {
                          const computed = (a && (Number(a.rank) || a.rank)) ? Number(a.rank) : (index + 1);
                          const displayRank = Number.isFinite(Number(computed)) ? Number(computed) + (Number(rankOffset) || 0) : computed;
                          return <AchievementCard achievement={a} devMode={devMode} autoThumbAvailable={a && a.levelID ? !!autoThumbMap[String(a.levelID)] : false} displayRank={displayRank} showRank={!hideRank} totalAchievements={achievements.length} achievements={achievements} mode={mode} usePlatformers={usePlatformers} showTiers={showTiers === true} />;
                        })()
                      }
                    </div>
                  );
                }}
              </ListWindow>
            )
          ))}
        </section>
      </main>
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
        {noMatchMessage}
      </div>
    </>
  );
}

const TagFilterPills = React.memo(TagFilterPillsInner, (prev, next) => {
  return prev.allTags === next.allTags && prev.filterTags === next.filterTags && prev.isMobile === next.isMobile && prev.show === next.show;
});
