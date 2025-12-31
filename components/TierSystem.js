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

export function computeTierBoundaries(totalAchievements, achievements = []) {
  if (!achievements || typeof achievements !== 'object') return null;
  const cached = tierCache.get(achievements);
  if (cached && cached.totalAchievements === totalAchievements && Array.isArray(cached.boundaries)) {
    return cached.boundaries;
  }

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
  const boundaries = [];
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

    boundaries.push({ start, end: endRank, tierIndex: i });
    start = endRank + 1;
  }

  tierCache.set(achievements, { totalAchievements, boundaries });
  return boundaries;
}

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
