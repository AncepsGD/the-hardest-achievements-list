import React from 'react'

export const TIERS = [
  { name: 'Trivial', subtitle: 'Tier I', baseline: 'ultiate-destruction', gradientStart: '#343a40', gradientEnd: '#0f1724', borderColor: '#2f343a', glowColor: 'rgba(63,76,86,0.10)' },
  { name: 'Simple', subtitle: 'Tier II', baseline: 'to-the-grave', gradientStart: '#374151', gradientEnd: '#0b1220', borderColor: '#4b5563', glowColor: 'rgba(75,85,99,0.08)' },
  { name: 'Novice', subtitle: 'Tier III', baseline: 'xyz-step-infinity-old', gradientStart: '#8b5cf6', gradientEnd: '#6d28d9', borderColor: '#6d28d9', glowColor: 'rgba(124,58,237,0.18)' },
  { name: 'Moderate', subtitle: 'Tier IV', baseline: 'cataclysm-old', gradientStart: '#34d399', gradientEnd: '#065f46', borderColor: '#059669', glowColor: 'rgba(6,182,212,0.14)' },
  { name: 'Challenging', subtitle: 'Tier V', baseline: 'the-ultimate-phase-old', gradientStart: '#d946ef', gradientEnd: '#7e22ce', borderColor: '#c026d3', glowColor: 'rgba(192,38,211,0.18)' },
  { name: 'Demanding', subtitle: 'Tier VI', baseline: 'sonic-wave-72', gradientStart: '#fb923c', gradientEnd: '#b45309', borderColor: '#fb923c', glowColor: 'rgba(251,146,60,0.14)' },
  { name: 'Hard', subtitle: 'Tier VII', baseline: 'bloodlust-98', gradientStart: '#f87171', gradientEnd: '#7f1d1d', borderColor: '#ef4444', glowColor: 'rgba(239,68,68,0.18)' },
  { name: 'Intense', subtitle: 'Tier VIII', baseline: 'crimson-planet', gradientStart: '#b91c1c', gradientEnd: '#520000', borderColor: '#b91c1c', glowColor: 'rgba(185,28,28,0.20)' },
  { name: 'Formidable', subtitle: 'Tier IX', baseline: 'zodiac', gradientStart: '#0f172a', gradientEnd: '#071233', borderColor: '#0b1224', glowColor: 'rgba(15,23,42,0.12)' },
  { name: 'Legendary', subtitle: 'Tier X', baseline: 'the-golden', gradientStart: '#fbbf24', gradientEnd: '#b45309', borderColor: '#f59e0b', glowColor: 'rgba(245,158,11,0.26)' },
  { name: 'Expert', subtitle: 'Tier XI', baseline: 'tartarus-91', gradientStart: '#2dd4bf', gradientEnd: '#115e59', borderColor: '#06b6d4', glowColor: 'rgba(6,182,212,0.16)' },
  { name: 'Master', subtitle: 'Tier XII', baseline: 'arcturus', gradientStart: '#60a5fa', gradientEnd: '#1e40af', borderColor: '#2563eb', glowColor: 'rgba(37,99,235,0.18)' },
  { name: 'Mythic', subtitle: 'Tier XIII', baseline: 'edge-of-destiny', gradientStart: '#a78bfa', gradientEnd: '#5b21b6', borderColor: '#7c3aed', glowColor: 'rgba(124,58,237,0.18)' },
  { name: 'Epic', subtitle: 'Tier XIV', baseline: 'firework', gradientStart: '#ff6b6b', gradientEnd: '#b91c1c', borderColor: '#ff3b3b', glowColor: 'rgba(255,59,59,0.22)' },
  { name: 'Endgame', subtitle: 'Tier XV', baseline: 'slaughterhouse', gradientStart: '#0f172a', gradientEnd: '#000000', borderColor: '#111827', glowColor: 'rgba(0,0,0,0.22)' },
  { name: 'Ultimate', subtitle: 'Tier XVI', baseline: 'acheron', gradientStart: '#374151', gradientEnd: '#0b1220', borderColor: '#111827', glowColor: 'rgba(17,24,39,0.18)' },
  { name: 'Godlike', subtitle: 'Tier XVII', baseline: 'boobawamba', gradientStart: '#ff4d88', gradientEnd: '#7f0033', borderColor: '#ff0044', glowColor: 'rgba(255,0,68,0.30)' },
  { name: 'Transcendent', subtitle: 'Tier XVIII', baseline: 'kocmoc-unleashed', gradientStart: '#2dd4bf', gradientEnd: '#0369a1', borderColor: '#06b6d4', glowColor: 'rgba(16,185,129,0.20)' },
]

function normalize(x) {

  if (x == null) return ''
  const s = String(x).trim().toLowerCase().normalize('NFKD').replace(/\u0300-\u036f/g, '')

  const noDiacritics = s.replace(/[\u0300-\u036f]/g, '')
  return noDiacritics.replace(/[^a-z0-9]/g, '')
}

function buildAchievementIndex(achievements = [], extraLists = {}) {
  const index = new Map()

  if (!Array.isArray(achievements)) return index

  for (let i = 0; i < achievements.length; i++) {
    const a = achievements[i]
    if (!a) continue
    if (a.id) {
      const k = normalize(a.id)
      if (k && !index.has(k)) index.set(k, i)
    }
    if (a.name) {
      const k = normalize(a.name)
      if (k && !index.has(k)) index.set(k, i)
    }
  }
  if (extraLists && typeof extraLists === 'object') {
    for (const list of Object.values(extraLists)) {
      if (!Array.isArray(list)) continue
      for (const item of list) {
        if (!item) continue
        const keys = []
        if (item.id) keys.push(normalize(item.id))
        if (item.name) keys.push(normalize(item.name))
        for (const k of keys) {
          if (!k || index.has(k)) continue

          const found = achievements.findIndex(a => !!a && (normalize(a.id) === k || normalize(a.name) === k))
          if (found >= 0) index.set(k, found)
        }
      }
    }
  }

  return index
}

function buildTierCutoffs(tiers = [], achievementIndex = new Map()) {
  const cutoffs = []

  for (const tier of tiers) {
    if (!tier || !tier.baseline) continue
    const key = normalize(tier.baseline)
    const idx = achievementIndex.get(key)
    if (idx == null) continue
    cutoffs.push({ tier, index: idx })
  }

  cutoffs.sort((a, b) => a.index - b.index)
  return cutoffs
}

export function getTierByRank(rank, a, b) {

  if (!rank || typeof rank !== 'number' || rank <= 0) return null

  let achievements = Array.isArray(a) ? a : Array.isArray(b) ? b : []
  let opts = (b && !Array.isArray(b)) ? b : (a && !Array.isArray(a) ? a : {})

  if (!Array.isArray(achievements)) return null

  const idx = rank - 1
  if (idx < 0) return null
  const tiers = (opts && opts.tiers) || TIERS
  const achievementIndex = buildAchievementIndex(achievements, opts.extraLists)
  const cutoffs = buildTierCutoffs(tiers, achievementIndex)

  if (cutoffs.length === 0) return null
  for (const c of cutoffs) {
    if (idx <= c.index) return c.tier
  }
  return cutoffs[cutoffs.length - 1].tier
}

export function getBaselineForTier(tier, achievements = [], extraLists = {}) {
  if (!tier || !tier.baseline) return null
  const index = buildAchievementIndex(achievements, extraLists)
  const idx = index.get(normalize(tier.baseline))
  return idx != null ? (achievements[idx]?.name || achievements[idx]?.id || tier.baseline) : tier.baseline
}

export function getTierForAchievement(achievementLike, achievements = [], options = {}) {

  if (!achievements || !Array.isArray(achievements) || achievements.length === 0) return null

  if (typeof achievementLike === 'number') {
    return getTierByRank(achievementLike + 1, achievements, options)
  }

  const key = typeof achievementLike === 'string' ? normalize(achievementLike) : achievementLike && (normalize(achievementLike.id) || normalize(achievementLike.name))
  if (!key) return null

  const idx = buildAchievementIndex(achievements, options.extraLists).get(key)
  if (idx == null) return null
  return getTierByRank(idx + 1, achievements, options)
}

export default function TierTag({ tier, achievements = [], extraLists = {} }) {
  if (!tier) return null

  const baseline = getBaselineForTier(tier, achievements, extraLists) ?? 'Unknown'

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
