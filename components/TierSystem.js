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
  return String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function buildAchievementIndex(achievements, extraLists) {
  const index = new Map()

  const ingest = (arr) => {
    if (!Array.isArray(arr)) return
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i]
      if (!a) continue
      if (a.id) index.set(normalize(a.id), i)
      if (a.name) index.set(normalize(a.name), i)
    }
  }

  ingest(achievements)

  if (extraLists) {
    for (const list of Object.values(extraLists)) {
      ingest(list)
    }
  }

  return index
}

function buildTierCutoffs(tiers, achievementIndex) {
  const cutoffs = []

  for (const tier of tiers) {
    const key = normalize(tier.baseline)
    const idx = achievementIndex.get(key)
    if (idx == null) continue
    cutoffs.push({
      tier,
      index: idx
    })
  }

  cutoffs.sort((a, b) => b.index - a.index)
  return cutoffs
}

export function getTierByRank(
  rank,
  achievements,
  opts = {}
) {
  if (!rank || rank <= 0) return null
  if (!Array.isArray(achievements)) return null

  const idx = rank - 1
  if (idx < 0 || idx >= achievements.length) return null

  const tiers = opts.tiers ?? TIERS
  const achievementIndex = buildAchievementIndex(achievements, opts.extraLists)
  const cutoffs = buildTierCutoffs(tiers, achievementIndex)

  for (const c of cutoffs) {
    if (idx <= c.index) {
      return c.tier
    }
  }

  return null
}

export function getBaselineForTier(tier, achievements, extraLists) {
  if (!tier?.baseline) return null
  const index = buildAchievementIndex(achievements, extraLists)
  const idx = index.get(normalize(tier.baseline))
  return idx != null ? achievements[idx]?.name : tier.baseline
}

export default function TierTag({ tier, achievements = [], extraLists = {} }) {
  if (!tier) return null

  const baseline =
    getBaselineForTier(tier, achievements, extraLists) ?? 'Unknown'

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
