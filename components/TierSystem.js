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
function normalize(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildBaselineIndex(achievements, extraLists) {
  const all = [...achievements];
  if (extraLists && typeof extraLists === 'object') {
    for (const list of Object.values(extraLists)) {
      if (Array.isArray(list)) all.push(...list);
    }
  }

  const map = new Map();
  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    if (!a) continue;
    if (a.id) map.set(normalize(a.id), i);
    if (a.name) map.set(normalize(a.name), i);
  }
  return map;
}

function resolveBaselines(tiers, baselineIndex) {
  return tiers.map(t => {
    if (!t.baseline) return -1;
    return baselineIndex.get(normalize(t.baseline)) ?? -1;
  });
}
function computeBaselineBoundaries(total, tiers, baselineIndices) {
  const boundaries = new Array(tiers.length);

  let prevEnd = total;

  for (let i = tiers.length - 1; i >= 0; i--) {
    const bIdx = baselineIndices[i];
    const end = bIdx >= 0 ? Math.min(prevEnd, bIdx + 1) : prevEnd;

    boundaries[i] = {
      start: 0,
      end,
      tierIndex: i
    };

    prevEnd = end - 1;
  }

  for (let i = 0; i < boundaries.length; i++) {
    boundaries[i].start = i === 0 ? 1 : boundaries[i - 1].end + 1;
  }

  return boundaries;
}
export function computeTierBoundaries(total, achievements = [], options = {}) {
  if (!Array.isArray(achievements) || total <= 0) return null;

  const tiers =
    options.tierIndices?.length
      ? options.tierIndices.map(i => TIERS[i]).filter(Boolean)
      : options.tiers?.length
        ? options.tiers
        : TIERS;

  const extraKey =
    options.extraLists && typeof options.extraLists === 'object'
      ? Object.keys(options.extraLists).sort().join(',')
      : '';

  const optionsKey =
    tiers.map(t => `${t.name}|${t.subtitle}`).join(',') +
    (extraKey ? `|extra:${extraKey}` : '');

  const cached = tierCache.get(achievements);
  if (
    cached &&
    cached.total === total &&
    cached.optionsKey === optionsKey
  ) {
    return cached.boundaries;
  }

  const baselineIndex = buildBaselineIndex(
    achievements,
    options.extraLists
  );

  const baselineIndices = resolveBaselines(tiers, baselineIndex);
  const boundaries = computeBaselineBoundaries(
    total,
    tiers,
    baselineIndices
  );

  tierCache.set(achievements, {
    total,
    optionsKey,
    boundaries,
    baselineIndices
  });

  return boundaries;
}

export function getTierByRank(
  rank,
  totalAchievements,
  achievements = [],
  enableTiers = true,
  opts = {}
) {
  if (!enableTiers || !rank || rank <= 0) return null;

  const boundaries =
    computeTierBoundaries(totalAchievements, achievements, opts) || [];

  for (const b of boundaries) {
    if (rank >= b.start && rank <= b.end) {
      return TIERS[b.tierIndex];
    }
  }

  return null;
}

export function getBaselineForTier(
  tierObj,
  _totalAchievements,
  achievements = [],
  extraLists = {}
) {
  if (!tierObj?.baseline) return null;

  const index = buildBaselineIndex(achievements, extraLists);
  const idx = index.get(normalize(tierObj.baseline));
  if (idx == null) return null;

  return achievements[idx]?.name ?? tierObj.baseline;
}
export default function TierTag({
  tier,
  totalAchievements,
  achievements = [],
  extraLists = {}
}) {
  if (!tier) return null;

  const baseline =
    getBaselineForTier(tier, totalAchievements, achievements, extraLists) ??
    'Unknown';

  const style = {
    '--tier-gradient-start': tier.gradientStart,
    '--tier-gradient-end': tier.gradientEnd
  };

  return (
    <div className="tier-tag" style={style} title={`Baseline: ${baseline}`}>
      <span className="tier-tag-text">
        {tier.name} – {tier.subtitle}
      </span>
    </div>
  );
}
