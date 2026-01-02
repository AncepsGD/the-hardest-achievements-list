import React from 'react'

export const TIERS = [
  { name: 'Trivial', subtitle: 'Tier I', baseline: 'ultiate-destruction', gradientStart: '#1f2933', gradientEnd: '#020617', borderColor: '#334155', glowColor: 'rgba(51,65,85,0.06)' },
  { name: 'Simple', subtitle: 'Tier II', baseline: 'to-the-grave', gradientStart: '#374151', gradientEnd: '#030712', borderColor: '#4b5563', glowColor: 'rgba(75,85,99,0.08)' },

  { name: 'Novice', subtitle: 'Tier III', baseline: 'xyz-step-infinity-old', gradientStart: '#7c3aed', gradientEnd: '#4c1d95', borderColor: '#8b5cf6', glowColor: 'rgba(139,92,246,0.14)' },
  { name: 'Moderate', subtitle: 'Tier IV', baseline: 'cataclysm-old', gradientStart: '#22c55e', gradientEnd: '#064e3b', borderColor: '#16a34a', glowColor: 'rgba(34,197,94,0.14)' },

  { name: 'Challenging', subtitle: 'Tier V', baseline: 'the-ultimate-phase-old', gradientStart: '#06b6d4', gradientEnd: '#083344', borderColor: '#22d3ee', glowColor: 'rgba(34,211,238,0.16)' },
  { name: 'Demanding', subtitle: 'Tier VI', baseline: 'sonic-wave-72', gradientStart: '#38bdf8', gradientEnd: '#0c4a6e', borderColor: '#0ea5e9', glowColor: 'rgba(14,165,233,0.18)' },

  { name: 'Hard', subtitle: 'Tier VII', baseline: 'bloodlust-98', gradientStart: '#f97316', gradientEnd: '#7c2d12', borderColor: '#fb923c', glowColor: 'rgba(251,146,60,0.20)' },
  { name: 'Intense', subtitle: 'Tier VIII', baseline: 'crimson-planet', gradientStart: '#ef4444', gradientEnd: '#450a0a', borderColor: '#dc2626', glowColor: 'rgba(239,68,68,0.22)' },

  { name: 'Formidable', subtitle: 'Tier IX', baseline: 'zodiac', gradientStart: '#a855f7', gradientEnd: '#3b0764', borderColor: '#c084fc', glowColor: 'rgba(192,132,252,0.22)' },
  { name: 'Legendary', subtitle: 'Tier X', baseline: 'the-golden', gradientStart: '#fde047', gradientEnd: '#92400e', borderColor: '#facc15', glowColor: 'rgba(250,204,21,0.28)' },

  { name: 'Expert', subtitle: 'Tier XI', baseline: 'tartarus-91', gradientStart: '#2dd4bf', gradientEnd: '#022c22', borderColor: '#5eead4', glowColor: 'rgba(94,234,212,0.22)' },
  { name: 'Master', subtitle: 'Tier XII', baseline: 'arcturus', gradientStart: '#60a5fa', gradientEnd: '#1e3a8a', borderColor: '#93c5fd', glowColor: 'rgba(147,197,253,0.24)' },

  { name: 'Mythic', subtitle: 'Tier XIII', baseline: 'edge-of-destiny', gradientStart: '#c084fc', gradientEnd: '#4c1d95', borderColor: '#e9d5ff', glowColor: 'rgba(233,213,255,0.28)' },
  { name: 'Epic', subtitle: 'Tier XIV', baseline: 'firework', gradientStart: '#ff4d6d', gradientEnd: '#7f1d1d', borderColor: '#ff758f', glowColor: 'rgba(255,117,143,0.32)' },

  { name: 'Endgame', subtitle: 'Tier XV', baseline: 'slaughterhouse', gradientStart: '#991b1b', gradientEnd: '#000000', borderColor: '#ef4444', glowColor: 'rgba(239,68,68,0.34)' },
  { name: 'Ultimate', subtitle: 'Tier XVI', baseline: 'acheron', gradientStart: '#0f172a', gradientEnd: '#020617', borderColor: '#38bdf8', glowColor: 'rgba(56,189,248,0.30)' },

  { name: 'Godlike', subtitle: 'Tier XVII', baseline: 'boobawamba', gradientStart: '#ff00aa', gradientEnd: '#2a0015', borderColor: '#ff4dd2', glowColor: 'rgba(255,77,210,0.40)' },
  { name: 'Transcendent', subtitle: 'Tier XVIII', baseline: 'kocmoc-unleashed', gradientStart: '#e5f0ff', gradientEnd: '#38bdf8', borderColor: '#ffffff', glowColor: 'rgba(255,255,255,0.55)' },
]

function normalize(x) {
  if (x == null) return ''
  return String(x)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function preprocessTimeline(achievements = [], extraLists = {}) {
  const index = new Map()
  const normalizedTimeline = new Array(achievements.length)

  for (let i = 0; i < achievements.length; i++) {
    const a = achievements[i]
    if (!a) continue

    const id = a.id ? normalize(a.id) : null
    const name = a.name ? normalize(a.name) : null

    normalizedTimeline[i] = { id, name }

    if (id && !index.has(id)) index.set(id, i)
    if (name && !index.has(name)) index.set(name, i)
  }

  if (extraLists && typeof extraLists === 'object') {
    for (const list of Object.values(extraLists)) {
      if (!Array.isArray(list)) continue
      for (const item of list) {
        if (!item) continue
        const id = item.id ? normalize(item.id) : null
        const name = item.name ? normalize(item.name) : null
        if (id && index.has(id)) continue
        if (name && index.has(name)) continue
        const k = id || name
        if (k && index.has(k)) continue
      }
    }
  }

  return { index, normalizedTimeline }
}

function buildTierCutoffsFast(tiers, timelineIndex) {
  const cutoffs = []

  for (const tier of tiers) {
    const key = normalize(tier.baseline)
    const idx = timelineIndex.get(key)
    if (idx != null) cutoffs.push({ index: idx, tier })
  }

  cutoffs.sort((a, b) => a.index - b.index)
  return cutoffs
}

function binaryTierLookup(rankIdx, cutoffs) {
  let lo = 0
  let hi = cutoffs.length - 1
  let res = cutoffs[hi].tier

  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (rankIdx <= cutoffs[mid].index) {
      res = cutoffs[mid].tier
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }
  return res
}

const timelineCache = new WeakMap()

function getCachedTimelineData(achievements, extraLists, tiers) {
  if (timelineCache.has(achievements)) {
    return timelineCache.get(achievements)
  }

  const { index } = preprocessTimeline(achievements, extraLists)
  const cutoffs = buildTierCutoffsFast(tiers, index)

  const data = { index, cutoffs }
  timelineCache.set(achievements, data)
  return data
}

export function getTierByRank(rank, achievements, options = {}) {
  if (!Number.isInteger(rank) || rank <= 0) return null
  if (!Array.isArray(achievements)) return null

  const tiers = options.tiers || TIERS
  const { cutoffs } = getCachedTimelineData(
    achievements,
    options.extraLists,
    tiers
  )

  if (!cutoffs.length) return null
  return binaryTierLookup(rank - 1, cutoffs)
}

export function getTierForAchievement(achievementLike, achievements, options = {}) {
  if (!Array.isArray(achievements) || !achievements.length) return null

  const key =
    typeof achievementLike === 'string'
      ? normalize(achievementLike)
      : achievementLike && normalize(achievementLike.id || achievementLike.name)

  if (!key) return null

  const tiers = options.tiers || TIERS
  const { index } = getCachedTimelineData(
    achievements,
    options.extraLists,
    tiers
  )

  const idx = index.get(key)
  if (idx == null) return null
  return getTierByRank(idx + 1, achievements, options)
}

export function getBaselineForTier(tier, achievements = [], extraLists = {}) {
  if (!tier || !tier.baseline) return null

  const key = normalize(tier.baseline)
  const { index } = preprocessTimeline(achievements, extraLists)
  const idx = index.get(key)

  return idx != null
    ? achievements[idx]?.name || achievements[idx]?.id
    : tier.baseline
}

export default function TierTag({ tier, achievements = [], extraLists = {} }) {
  if (!tier) return null

  const baseline =
    getBaselineForTier(tier, achievements, extraLists) ?? 'Unknown'

  return (
    <div
      className="tier-tag"
      data-glow={tier.glowColor ? 'true' : 'false'}
      style={{
        '--tier-gradient-start': tier.gradientStart,
        '--tier-gradient-end': tier.gradientEnd,
        '--tier-border': tier.borderColor || 'transparent',
        '--tier-glow': tier.glowColor || 'transparent'
      }}
      title={`Baseline: ${baseline}`}
    >
      <span className="tier-tag-text">
        {tier.name} – {tier.subtitle}
      </span>
    </div>
  )
}
