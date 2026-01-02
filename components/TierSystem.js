import React from 'react';

export const TIERS = [
  { name: 'Trivial', subtitle: 'Tier I', percent: 5, baseline: 'ultiate-destruction', gradientStart: '#343a40', gradientEnd: '#0f1724' },
  { name: 'Simple', subtitle: 'Tier II', percent: 5, baseline: 'to-the-grave', gradientStart: '#1f2937', gradientEnd: '#0b1220' },
  { name: 'Novice', subtitle: 'Tier III', percent: 5, baseline: 'pg-clubstep-old', gradientStart: '#7c3aed', gradientEnd: '#5b21b6' },
  { name: 'Moderate', subtitle: 'Tier IV', percent: 5, baseline: 'ice-carbon-diablo-x', gradientStart: '#0ea5a4', gradientEnd: '#036666' },
  { name: 'Challenging', subtitle: 'Tier V', percent: 5, baseline: 'the-ultimate-phase-old', gradientStart: '#c026d3', gradientEnd: '#7b1fa2' },
  { name: 'Demanding', subtitle: 'Tier VI', percent: 5, baseline: 'sonic-wave-72', gradientStart: '#f97316', gradientEnd: '#b45309' },
  { name: 'Hard', subtitle: 'Tier VII', percent: 5, baseline: 'bloodlust-76', gradientStart: '#ef4444', gradientEnd: '#7f1d1d' },
  { name: 'Intense', subtitle: 'Tier VIII', percent: 5, baseline: 'crimson-planet', gradientStart: '#b91c1c', gradientEnd: '#520000' },
  { name: 'Formidable', subtitle: 'Tier IX', percent: 5, baseline: 'zodiac', gradientStart: '#0f172a', gradientEnd: '#071233' },
  { name: 'Legendary', subtitle: 'Tier X', percent: 5, baseline: 'the-golden', gradientStart: '#f59e0b', gradientEnd: '#b45309' },
  { name: 'Expert', subtitle: 'Tier XI', percent: 5, baseline: 'tartarus-91', gradientStart: '#0ea5a4', gradientEnd: '#036666' },
  { name: 'Master', subtitle: 'Tier XII', percent: 5, baseline: 'arcturus', gradientStart: '#2563eb', gradientEnd: '#1e40af' },
  { name: 'Mythic', subtitle: 'Tier XIII', percent: 5, baseline: 'edge of destiny', gradientStart: '#7c3aed', gradientEnd: '#4c1d95' },
  { name: 'Epic', subtitle: 'Tier XIV', percent: 5, baseline: 'firework', gradientStart: '#ff3b3b', gradientEnd: '#b91c1c' },
  { name: 'Endgame', subtitle: 'Tier XV', percent: 5, baseline: 'slaughterhouse', gradientStart: '#0f172a', gradientEnd: '#000000' },
  { name: 'Ultimate', subtitle: 'Tier XVI', percent: 5, baseline: 'acheron', gradientStart: '#111827', gradientEnd: '#0b1220' },
  { name: 'Godlike', subtitle: 'Tier XVII', percent: 5, baseline: 'boobawamba', gradientStart: '#ff0044', gradientEnd: '#7f0033' },
  { name: 'Transcendent', subtitle: 'Tier XVIII', percent: 5, baseline: 'kocmoc-unleashed', gradientStart: '#0ea5a4', gradientEnd: '#0369a1' },
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
  const revSizes = sizes.slice().reverse();
  const revTiers = TIERS.slice().reverse();

  const flags = new Array(totalAchievements).fill(false);
  const achLen = Array.isArray(achievements) ? achievements.length : 0;
  const limit = Math.min(totalAchievements, achLen);
  for (let i = 0; i < limit; i++) {
    flags[i] = hasRatedAndVerified(achievements[i]);
  }
  let start = 1;
  const boundaries = [];
  for (let ri = 0; ri < revTiers.length; ri++) {
    const size = revSizes[ri];
    const originalIndex = TIERS.length - 1 - ri;
    if (size <= 0) {
      boundaries.push({ start, end: Math.min(totalAchievements, start - 1), tierIndex: originalIndex });
      continue;
    }
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

    boundaries.push({ start, end: endRank, tierIndex: originalIndex });
    start = endRank + 1;
    if (start > totalAchievements) {
      for (let k = ri + 1; k < revTiers.length; k++) {
        const origIdx = TIERS.length - 1 - k;
        boundaries.push({ start: totalAchievements + 1, end: totalAchievements, tierIndex: origIdx });
      }
      break;
    }
  }

  tierCache.set(achievements, { totalAchievements, boundaries, sizes, flags });
  return boundaries;
}

function hasRatedAndVerified(item) {
  if (!item) return false;
  if (item.rated === true && item.verified === true) return true;

  const toLower = (v) => (v == null ? '' : String(v).toLowerCase());

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
        const v = toLower(val[i]);
        if (!hasRated && v.includes('rated')) hasRated = true;
        if (!hasVerified && v.includes('verified')) hasVerified = true;
        if (hasRated && hasVerified) return true;
      }
      return false;
    }
    if (typeof val === 'object') {
      for (const k in val) {
        if (!Object.prototype.hasOwnProperty.call(val, k)) continue;
        const v = toLower(val[k]);
        if (v.includes('rated') && v.includes('verified')) return true;
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

  return false;
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

export function getBaselineForTier(tierObj, totalAchievements, achievements = [], extraLists = {}) {
  if (!tierObj) return null;

  const resolveBaselineName = (baselineId) => {
    if (!baselineId || typeof baselineId !== 'string') return null;

    const a = (achievements || []).find(x => x && (x.id === baselineId || x.name === baselineId));
    if (a) return a.name || baselineId;

    if (extraLists && typeof extraLists === 'object') {
      for (const k in extraLists) {
        if (!Object.prototype.hasOwnProperty.call(extraLists, k)) continue;
        const list = extraLists[k];
        if (!Array.isArray(list)) continue;
        const f = list.find(x => x && (x.id === baselineId || x.name === baselineId));
        if (f) return f.name || baselineId;
      }
    }
    return baselineId;
  };
  if (tierObj && typeof tierObj.baseline === 'string' && tierObj.baseline.trim() !== '') {
    const resolved = resolveBaselineName(tierObj.baseline.trim());
    return resolved || tierObj.baseline;
  }

  if (!achievements.length) return null;
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

export default function TierTag({ tier, totalAchievements, achievements = [], extraLists = {} }) {
  if (!tier) return null;
  const baseline = getBaselineForTier(tier, totalAchievements, achievements, extraLists) || 'Unknown';
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
