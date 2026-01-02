import React from 'react'

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
  { name: 'Mythic', subtitle: 'Tier XIII', baseline: 'edge-of-destiny', gradientStart: '#7c3aed', gradientEnd: '#4c1d95' },
  { name: 'Epic', subtitle: 'Tier XIV', baseline: 'firework', gradientStart: '#ff3b3b', gradientEnd: '#b91c1c' },
  { name: 'Endgame', subtitle: 'Tier XV', baseline: 'slaughterhouse', gradientStart: '#0f172a', gradientEnd: '#000000' },
  { name: 'Ultimate', subtitle: 'Tier XVI', baseline: 'acheron', gradientStart: '#111827', gradientEnd: '#0b1220' },
  { name: 'Godlike', subtitle: 'Tier XVII', baseline: 'boobawamba', gradientStart: '#ff0044', gradientEnd: '#7f0033' },
  { name: 'Transcendent', subtitle: 'Tier XVIII', baseline: 'kocmoc-unleashed', gradientStart: '#0ea5a4', gradientEnd: '#0369a1' },
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
  )
}
