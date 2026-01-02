import React from 'react';

export const TIERS = [
  { name: 'Trivial', subtitle: 'Tier I', baseline: 'ultiate-destruction', gradientStart: '#343a40', gradientEnd: '#0f1724' },
  { name: 'Simple', subtitle: 'Tier II', baseline: 'to-the-grave', gradientStart: '#1f2937', gradientEnd: '#0b1220' },
  { name: 'Novice', subtitle: 'Tier III', baseline: 'pg-clubstep-old', gradientStart: '#7c3aed', gradientEnd: '#5b21b6' },
  { name: 'Moderate', subtitle: 'Tier IV', baseline: 'ice-carbon-diablo-x', gradientStart: '#0ea5a4', gradientEnd: '#036666' },
  { name: 'Challenging', subtitle: 'Tier V', baseline: 'the-ultimate-phase-old', gradientStart: '#c026d3', gradientEnd: '#7b1fa2' },
  { name: 'Demanding', subtitle: 'Tier VI', baseline: 'sonic-wave-72', gradientStart: '#f97316', gradientEnd: '#b45309' },
  { name: 'Hard', subtitle: 'Tier VII', baseline: 'bloodlust', gradientStart: '#ef4444', gradientEnd: '#7f1d1d' },
  { name: 'Intense', subtitle: 'Tier VIII', baseline: 'crimson-planet', gradientStart: '#b91c1c', gradientEnd: '#520000' },
  { name: 'Formidable', subtitle: 'Tier IX', baseline: 'zodiac', gradientStart: '#0f172a', gradientEnd: '#071233' },
  { name: 'Legendary', subtitle: 'Tier X', baseline: 'the-golden', gradientStart: '#f59e0b', gradientEnd: '#b45309' },
  { name: 'Expert', subtitle: 'Tier XI', baseline: 'tartarus', gradientStart: '#0ea5a4', gradientEnd: '#036666' },
  { name: 'Master', subtitle: 'Tier XII', baseline: 'arcturus', gradientStart: '#2563eb', gradientEnd: '#1e40af' },
  { name: 'Mythic', subtitle: 'Tier XIII', baseline: 'edge of destiny', gradientStart: '#7c3aed', gradientEnd: '#4c1d95' },
  { name: 'Epic', subtitle: 'Tier XIV', baseline: 'firework', gradientStart: '#ff3b3b', gradientEnd: '#b91c1c' },
  { name: 'Endgame', subtitle: 'Tier XV', baseline: 'slaughterhouse', gradientStart: '#0f172a', gradientEnd: '#000000' },
  { name: 'Ultimate', subtitle: 'Tier XVI', baseline: 'acheron', gradientStart: '#111827', gradientEnd: '#0b1220' },
  { name: 'Godlike', subtitle: 'Tier XVII', baseline: 'boobawamba', gradientStart: '#ff0044', gradientEnd: '#7f0033' },
  { name: 'Transcendent', subtitle: 'Tier XVIII', baseline: 'kocmoc-unleashed', gradientStart: '#0ea5a4', gradientEnd: '#0369a1' },
];

const tierCache = new WeakMap();
const TIERS_MAP = new Map(TIERS.map((t, i) => [`${t.name}|${t.subtitle}`, i]));

function hasRatedAndVerified(item, cache = new WeakMap()) {
  if (!item) return false;
  if (cache.has(item)) return cache.get(item);

  const toLower = v => (v == null ? '' : String(v).toLowerCase());
  const check = val => {
    if (!val) return false;
    if (typeof val === 'string') return val.toLowerCase().includes('rated') && val.toLowerCase().includes('verified');
    if (Array.isArray(val)) return val.some(v => check(v));
    if (typeof val === 'object') return Object.values(val).some(v => check(v));
    return false;
  };

  const result = item.rated === true && item.verified === true
    || check(item.tags) || check(item.tag) || check(item.labels) || check(item.label) || check(item.status) || check(item.meta)
    || (item.achievement && (check(item.achievement.tags) || check(item.achievement.label) || check(item.achievement.status)));

  cache.set(item, result);
  return result;
}

function computeSizes(total, tiers) {
  const n = tiers.length;
  if (n === 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const sizes = new Array(n).fill(base);
  for (let i = 0; i < remainder; i++) sizes[n - 1 - (i % n)] += 1;
  return sizes;
}

export function computeTierBoundaries(total, achievements = [], options = {}) {
  if (!Array.isArray(achievements)) return null;

  const cached = tierCache.get(achievements);

  const tiers = options.tierIndices?.length ? options.tierIndices.map(i => TIERS[i]).filter(Boolean)
    : options.tiers?.length ? options.tiers
      : TIERS;

  const optionsKey = options.tierIndices?.join(',') ?? options.tiers?.map(t => `${t.name}|${t.subtitle}`).join(',') ?? '';

  if (cached?.totalAchievements === total && cached?.optionsKey === optionsKey) return cached.boundaries;

  const sizes = computeSizes(total, tiers);
  const flags = new Array(total).fill(false);
  const achLen = achievements.length;
  const hrCache = new WeakMap();
  for (let i = 0; i < Math.min(total, achLen); i++) flags[i] = hasRatedAndVerified(achievements[i], hrCache);

  const prevFlagIdx = new Array(total);
  let prev = -1;
  for (let i = 0; i < total; i++) prevFlagIdx[i] = (i < achLen && flags[i]) ? (prev = i) : prev;

  const boundaries = [];
  let start = 1;
  for (let i = tiers.length - 1; i >= 0; i--) {
    const size = sizes[i];
    const tierIndex = TIERS_MAP.get(`${tiers[i].name}|${tiers[i].subtitle}`) ?? (TIERS.length - 1 - i);
    const tierStartIdx = start - 1;
    const tierEndIdx = Math.min(total - 1, start + size - 1);
    const candidate = tierEndIdx >= 0 && tierEndIdx < total ? prevFlagIdx[tierEndIdx] : -1;
    const endRank = candidate >= tierStartIdx ? candidate + 1 : tierEndIdx + 1;
    boundaries.push({ start, end: endRank, tierIndex });
    start = endRank + 1;
  }

  tierCache.set(achievements, { totalAchievements: total, boundaries, sizes, flags, prevFlagIdx, optionsKey });
  return boundaries;
}

export function getTierByRank(rank, totalAchievements, achievements = [], enableTiers = true, opts = {}) {
  if (typeof enableTiers === 'object' && enableTiers !== null) {
    opts = enableTiers;
    enableTiers = true;
  }
  if (!enableTiers || !rank || rank <= 0 || !totalAchievements) return null;

  const listType = opts.listType || null;
  let boundaries = null;

  const getIndices = (startName, endName) => {
    const start = TIERS.findIndex(t => t.name.toLowerCase() === startName.toLowerCase());
    const end = TIERS.findIndex(t => t.name.toLowerCase() === endName.toLowerCase());
    if (start >= 0 && end >= 0 && end >= start) return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    return [];
  };

  if (listType === 'main') boundaries = computeTierBoundaries(totalAchievements, achievements, { tierIndices: getIndices('Expert', 'Godlike') });
  else if (listType === 'timeline') boundaries = computeTierBoundaries(totalAchievements, achievements, { tierIndices: getIndices('Trivial', 'Godlike') });
  else if (listType === 'legacy') boundaries = computeTierBoundaries(totalAchievements, achievements, { tierIndices: getIndices('Hard', 'Legendary') });

  if (!boundaries) boundaries = computeTierBoundaries(totalAchievements, achievements) || [];

  for (const b of boundaries) if (rank >= b.start && rank <= b.end) return TIERS[b.tierIndex];
  return null;
}

export function getBaselineForTier(tierObj, totalAchievements, achievements = [], extraLists = {}) {
  if (!tierObj) return null;

  const resolveBaselineName = (baselineId) => {
    if (!baselineId || typeof baselineId !== 'string') return null;
    const allAchievements = [...achievements, ...Object.values(extraLists).flat().filter(Array.isArray).flat()];
    const map = new Map(allAchievements.map(x => x && (x.id || x.name) ? [x.id || x.name, x.name || x.id] : []));
    return map.get(baselineId) ?? baselineId;
  };

  if (tierObj.baseline?.trim()) return resolveBaselineName(tierObj.baseline.trim());

  if (!achievements.length) return null;
  let cached = tierCache.get(achievements);
  if (!cached || cached.totalAchievements !== totalAchievements) computeTierBoundaries(totalAchievements, achievements);
  cached = tierCache.get(achievements);
  if (!cached) return null;

  const { boundaries = [], flags = [] } = cached;

  for (const b of boundaries) {
    const t = TIERS[b.tierIndex];
    if (t.name === tierObj.name && t.subtitle === tierObj.subtitle) {
      const startIdx = Math.max(0, b.start - 1);
      const endIdx = Math.min(totalAchievements - 1, b.end - 1);
      for (let j = endIdx; j >= startIdx; j--) if (flags[j] && j < achievements.length) return achievements[j]?.name || 'Unknown';
      if (endIdx >= 0 && endIdx < achievements.length) return achievements[endIdx]?.name || 'Unknown';
      return null;
    }
  }
  return null;
}

export default function TierTag({ tier, totalAchievements, achievements = [], extraLists = {} }) {
  if (!tier) return null;
  const baseline = getBaselineForTier(tier, totalAchievements, achievements, extraLists) || 'Unknown';
  const title = `${tier.name} – ${tier.subtitle}\nBaseline is ${baseline}`;
  const style = { '--tier-gradient-start': tier.gradientStart, '--tier-gradient-end': tier.gradientEnd };
  return (
    <div className="tier-tag" style={style} title={title}>
      <span className="tier-tag-text">{tier.name} – {tier.subtitle}</span>
    </div>
  );
}
