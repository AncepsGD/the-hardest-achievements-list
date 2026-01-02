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

function normalize(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const NORMALIZED_TIERS = TIERS.map((t, i) => ({
  ...t,
  _index: i,
  _baselineKey: normalize(t.baseline)
}));

const contextCache = new WeakMap();

function buildBaselineIndex(achievements = [], extraLists = {}) {
  const map = new Map();

  for (let i = 0; i < achievements.length; i++) {
    const a = achievements[i];
    if (!a) continue;
    if (a.id) map.set(normalize(a.id), i);
    if (a.name) map.set(normalize(a.name), i);
  }

  if (extraLists) {
    for (const list of Object.values(extraLists)) {
      if (!Array.isArray(list)) continue;
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a) continue;
        const keyId = a.id ? normalize(a.id) : null;
        const keyName = a.name ? normalize(a.name) : null;
        let resolvedIndex = null;
        if (keyId && map.has(keyId)) resolvedIndex = map.get(keyId);
        else if (keyName && map.has(keyName)) resolvedIndex = map.get(keyName);
        else {
          if (keyId) {
            for (let j = 0; j < achievements.length; j++) {
              const aa = achievements[j];
              if (!aa) continue;
              if (normalize(aa.id) === keyId || normalize(aa.name) === keyId) {
                resolvedIndex = j;
                break;
              }
            }
          }
          if (resolvedIndex == null && keyName) {
            for (let j = 0; j < achievements.length; j++) {
              const aa = achievements[j];
              if (!aa) continue;
              if (normalize(aa.id) === keyName || normalize(aa.name) === keyName) {
                resolvedIndex = j;
                break;
              }
            }
          }
        }
        if (resolvedIndex != null) {
          if (keyId) map.set(keyId, resolvedIndex);
          if (keyName) map.set(keyName, resolvedIndex);
        }
      }
    }
  }

  return map;
}

function computeBoundaries(total, tiers, baselineIndex) {
  const boundaries = new Array(tiers.length);
  let prevEnd = Math.max(0, total);

  for (let i = tiers.length - 1; i >= 0; i--) {
    const b = baselineIndex.get(tiers[i]._baselineKey);
    const candidateEnd = b != null ? b + 1 : prevEnd;
    const end = Math.min(prevEnd, Math.max(0, candidateEnd));
    boundaries[i] = {
      tierIndex: i,
      start: 0,
      end
    };
    prevEnd = end - 1;
  }

  for (let i = 0; i < boundaries.length; i++) {
    boundaries[i].start = i === 0 ? 1 : boundaries[i - 1].end + 1;
    if (boundaries[i].start > boundaries[i].end) boundaries[i].end = Math.max(boundaries[i].start - 1, boundaries[i].start);
  }

  return boundaries;
}

function compileContext(achievements, total, tiers, extraLists) {
  const cached = contextCache.get(achievements);
  const tiersKey = (tiers || []).map(t => `${t._baselineKey}:${t.name}`).join('|');
  if (cached && cached.total === total && cached.tiersKey === tiersKey) {
    return cached;
  }

  const baselineIndex = buildBaselineIndex(achievements, extraLists);
  const boundaries = computeBoundaries(total, tiers, baselineIndex);

  const ctx = { baselineIndex, boundaries, total, tiers, tiersKey };
  contextCache.set(achievements, ctx);
  return ctx;
}

export function getTierByRank(
  rank,
  total,
  achievements = [],
  enableTiers = true,
  opts = {}
) {
  if (!enableTiers || rank <= 0) return null;

  const tiers = opts.tiers ?? NORMALIZED_TIERS;
  const { boundaries } = compileContext(
    achievements,
    total,
    tiers,
    opts.extraLists
  );

  let lo = 0;
  let hi = boundaries.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = boundaries[mid];

    if (rank < b.start) hi = mid - 1;
    else if (rank > b.end) lo = mid + 1;
    else return tiers[b.tierIndex];
  }

  return null;
}

export function getBaselineForTier(
  tier,
  achievements,
  extraLists = {}
) {
  if (!tier?.baseline) return null;

  const ctx = compileContext(
    achievements,
    achievements.length,
    NORMALIZED_TIERS,
    extraLists
  );

  const idx = ctx.baselineIndex.get(normalize(tier.baseline));
  return idx != null ? achievements[idx]?.name : tier.baseline;
}

export default function TierTag({
  tier,
  achievements = [],
  extraLists = {}
}) {
  if (!tier) return null;

  const baseline =
    getBaselineForTier(tier, achievements, extraLists) ?? 'Unknown';

  return (
    <div
      className="tier-tag"
      style={{
        '--tier-gradient-start': tier.gradientStart,
        '--tier-gradient-end': tier.gradientEnd
      }}
      title={`Baseline: ${baseline}`}
    >
      <span className="tier-tag-text">
        {tier.name} – {tier.subtitle}
      </span>
    </div>
  );
}
