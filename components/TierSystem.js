import React from 'react';

export const TIERS = [
  { name: 'Tier I', subtitle: 'Endgame', percent: 4, gradientStart: '#FFD700', gradientEnd: '#FF8C00' },
  { name: 'Tier II', subtitle: 'Master', percent: 6, gradientStart: '#E8E8E8', gradientEnd: '#999999' },
  { name: 'Tier III', subtitle: 'Expert', percent: 8, gradientStart: '#D4AF37', gradientEnd: '#8B6914' },
  { name: 'Tier IV', subtitle: 'Advanced', percent: 12, gradientStart: '#FF5555', gradientEnd: '#BB0000' },
  { name: 'Tier V', subtitle: 'Intermediate', percent: 16, gradientStart: '#5B9BF5', gradientEnd: '#1E40AF' },
  { name: 'Tier VI', subtitle: 'Developing', percent: 24, gradientStart: '#65C641', gradientEnd: '#0D7F2F' },
  { name: 'Tier VII', subtitle: 'Entry', percent: 30, gradientStart: '#B955F7', gradientEnd: '#6B21A8' },
];

const tierCache = new WeakMap();

function computeSizes(totalAchievements) {
  const sizes = TIERS.map(t => Math.floor(totalAchievements * (t.percent / 100)));
  let allocated = sizes.reduce((a, b) => a + b, 0);
  let remainingToAllocate = totalAchievements - allocated;
  let idx = 0;
  const len = TIERS.length;
  while (remainingToAllocate > 0 && len > 0) {
    sizes[idx % len] += 1;
    remainingToAllocate -= 1;
    idx += 1;
  }
  return sizes;
}

export function computeTierBoundaries(totalAchievements, achievements = []) {
  if (!achievements || typeof achievements !== 'object') return null;
  const cached = tierCache.get(achievements);
  if (cached && cached.totalAchievements === totalAchievements && Array.isArray(cached.boundaries)) {
    return cached.boundaries;
  }

  const sizes = computeSizes(totalAchievements);

  const flags = new Array(totalAchievements);
  for (let i = 0; i < totalAchievements; i++) {
    flags[i] = hasRatedAndVerified(achievements[i]);
  }

  let start = 1;
  const boundaries = [];
  for (let i = 0; i < TIERS.length; i++) {
    const size = sizes[i];
    const tierStartIdx = start - 1;
    const tierEndIdx = Math.min(totalAchievements - 1, start + size - 1);

    let foundIndex = -1;
    for (let j = tierEndIdx; j >= tierStartIdx; j--) {
      if (j >= 0 && j < totalAchievements && flags[j]) {
        foundIndex = j;
        break;
      }
    }

    let endRank;
    if (foundIndex >= 0) {
      endRank = foundIndex + 1;
    } else {
      endRank = Math.min(totalAchievements, start + size - 1);
    }

    boundaries.push({ start, end: endRank, tierIndex: i });
    start = endRank + 1;
  }

  tierCache.set(achievements, { totalAchievements, boundaries, sizes, flags });
  return boundaries;
}

function hasRatedAndVerified(item) {
  if (!item) return false;
  if (item.rated === true && item.verified === true) return true;

  const checkStringOrArray = (val) => {
    if (!val) return false;
    if (typeof val === 'string') {
      const s = val.toLowerCase();
      return s.includes('rated') && s.includes('verified');
    }
    if (Array.isArray(val)) {
      let hasRated = false;
      let hasVerified = false;
      for (let i = 0; i < val.length; i++) {
        const v = val[i] == null ? '' : String(val[i]).toLowerCase();
        if (!hasRated && v.includes('rated')) hasRated = true;
        if (!hasVerified && v.includes('verified')) hasVerified = true;
        if (hasRated && hasVerified) return true;
      }
      return false;
    }
    if (typeof val === 'object') {
      for (const k in val) {
        if (!Object.prototype.hasOwnProperty.call(val, k)) continue;
        const v = val[k];
        if (v == null) continue;
        const s = String(v).toLowerCase();
        if (s.includes('rated') && s.includes('verified')) return true;
      }
      return false;
    }
    return false;
  };

  if (checkStringOrArray(item.tags)) return true;
  if (checkStringOrArray(item.tag)) return true;
  if (checkStringOrArray(item.labels)) return true;
  if (checkStringOrArray(item.label)) return true;
  if (checkStringOrArray(item.status)) return true;
  if (checkStringOrArray(item.meta)) return true;

  const ach = item.achievement;
  if (ach && typeof ach === 'object') {
    if (checkStringOrArray(ach.tags)) return true;
    if (checkStringOrArray(ach.label)) return true;
    if (checkStringOrArray(ach.status)) return true;
  }

  try {
    const s = JSON.stringify(item).toLowerCase();
    return s.includes('rated') && s.includes('verified');
  } catch (e) {
    return false;
  }
}

export function getTierByRank(rank, totalAchievements, achievements = [], enableTiers = true) {
  if (!enableTiers) return null;
  if (!rank || !totalAchievements || rank <= 0) return null;

  const boundaries = computeTierBoundaries(totalAchievements, achievements) || [];
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    if (rank >= b.start && rank <= b.end) return TIERS[b.tierIndex];
  }

  return null;
}

export function getBaselineForTier(tierObj, totalAchievements, achievements = []) {
  if (!tierObj || !achievements.length) return null;
  let cached = tierCache.get(achievements);
  if (!cached || cached.totalAchievements !== totalAchievements) {
    computeTierBoundaries(totalAchievements, achievements);
    cached = tierCache.get(achievements);
  }
  if (!cached) return null;

  const { boundaries = [], flags = [] } = cached;

  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    const t = TIERS[b.tierIndex];
    if (t.name === tierObj.name && t.subtitle === tierObj.subtitle) {
      const startIdx = Math.max(0, b.start - 1);
      const endIdx = Math.min(totalAchievements - 1, b.end - 1);
      for (let j = endIdx; j >= startIdx; j--) {
        if (flags[j] && j < achievements.length) return achievements[j]?.name || 'Unknown';
      }
      if (endIdx >= 0 && endIdx < achievements.length) return achievements[endIdx]?.name || 'Unknown';
      return null;
    }
  }
  return null;
}

export default function TierTag({ tier, totalAchievements, achievements = [] }) {
  if (!tier) return null;
  const baseline = getBaselineForTier(tier, totalAchievements, achievements) || 'Unknown';
  const title = `${tier.name} – ${tier.subtitle}\n${tier.percent}% of achievements\nBaseline is ${baseline}`;
  const style = {
    '--tier-gradient-start': tier.gradientStart,
    '--tier-gradient-end': tier.gradientEnd,
  };
  return (
    <div className="tier-tag" style={style} title={title}>
      <span className="tier-tag-text">{tier.name} – {tier.subtitle}</span>
    </div>
  );
}
