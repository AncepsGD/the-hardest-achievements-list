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
  const s = String(x).trim().toLowerCase().normalize('NFKD')

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

function buildMasterOrder(extraLists = {}, achievements = []) {

  let master = null
  if (extraLists && typeof extraLists === 'object') {
    for (const list of Object.values(extraLists)) {
      if (Array.isArray(list) && (!master || list.length > master.length)) master = list
    }
  }

  if (!Array.isArray(master)) master = Array.isArray(achievements) ? achievements : []

  const map = new Map()
  for (let i = 0; i < master.length; i++) {
    const item = master[i]
    if (!item) continue
    if (item.id) map.set(normalize(item.id), i)
    if (item.name) map.set(normalize(item.name), i)
  }
  return { map, master }
}

function mapMasterCutoffsToTimeline(tiers = [], timeline = [], extraLists = {}) {
  const { map: masterMap } = buildMasterOrder(extraLists, timeline)
  const timelineMasterIdx = timeline.map(item => {
    if (!item) return null
    const k1 = item.id ? normalize(item.id) : null
    const k2 = item.name ? normalize(item.name) : null
    return (k1 && masterMap.has(k1)) ? masterMap.get(k1) : (k2 && masterMap.has(k2) ? masterMap.get(k2) : null)
  })

  const cutoffs = []

  for (const tier of tiers) {
    if (!tier || !tier.baseline) continue
    const key = normalize(tier.baseline)
    const directIdx = timeline.findIndex(a => !!a && (normalize(a.id) === key || normalize(a.name) === key))
    if (directIdx >= 0) {
      cutoffs.push({ tier, index: directIdx })
      continue
    }
    const baselineMasterIdx = masterMap.has(key) ? masterMap.get(key) : null
    if (baselineMasterIdx == null) continue

    let mappedIdx = null
    for (let i = 0; i < timelineMasterIdx.length; i++) {
      const m = timelineMasterIdx[i]
      if (m != null && m >= baselineMasterIdx) {
        mappedIdx = i
        break
      }
    }
    if (mappedIdx == null && timeline.length > 0) mappedIdx = timeline.length - 1

    if (mappedIdx != null) cutoffs.push({ tier, index: mappedIdx })
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
  const timelineCutoffs = buildTimelineCutoffs(tiers, achievements)
  const masterCutoffs = mapMasterCutoffsToTimeline(tiers, achievements, opts.extraLists)
  const cutoffs = (timelineCutoffs && timelineCutoffs.length > 0)
    ? timelineCutoffs
    : (masterCutoffs && masterCutoffs.length > 0) ? masterCutoffs : buildTierCutoffs(tiers, achievementIndex)

  if (cutoffs.length === 0) return null
  for (const c of cutoffs) {
    if (idx <= c.index) return c.tier
  }
  return cutoffs[cutoffs.length - 1].tier
}

export function getBaselineForTier(tier, achievements = [], extraLists = {}) {
  if (!tier || !tier.baseline) return null

  const key = normalize(tier.baseline)
  const index = buildAchievementIndex(achievements, extraLists)
  const idx = index.get(key)
  if (idx != null) return (achievements[idx]?.name || achievements[idx]?.id || tier.baseline)
  if (extraLists && typeof extraLists === 'object') {
    for (const list of Object.values(extraLists)) {
      if (!Array.isArray(list)) continue
      const found = list.find(item => item && (normalize(item.id) === key || normalize(item.name) === key))
      if (found) return found.name || found.id || tier.baseline
    }
  }

  return tier.baseline
}

export function getTierForAchievement(achievementLike, achievements = [], options = {}) {

  if (!achievements || !Array.isArray(achievements) || achievements.length === 0) return null

  if (typeof achievementLike === 'number') {
    return getTierByRank(achievementLike + 1, achievements, options)
  }

  const key = typeof achievementLike === 'string' ? normalize(achievementLike) : achievementLike && (normalize(achievementLike.id) || normalize(achievementLike.name))
  if (!key) return null

  const achievementIndex = buildAchievementIndex(achievements, options.extraLists)
  const idx = achievementIndex.get(key)
  if (idx != null) return getTierByRank(idx + 1, achievements, options)
  const { map: masterMap } = buildMasterOrder(options.extraLists, achievements)
  const masterIdx = masterMap.has(key) ? masterMap.get(key) : null
  if (masterIdx == null) return null
  const timelineMasterIdx = achievements.map(item => {
    if (!item) return null
    const k1 = item.id ? normalize(item.id) : null
    const k2 = item.name ? normalize(item.name) : null
    return (k1 && masterMap.has(k1)) ? masterMap.get(k1) : (k2 && masterMap.has(k2) ? masterMap.get(k2) : null)
  })
  let mappedIdx = null
  for (let i = 0; i < timelineMasterIdx.length; i++) {
    const m = timelineMasterIdx[i]
    if (m != null && m >= masterIdx) {
      mappedIdx = i
      break
    }
  }
  if (mappedIdx == null && achievements.length > 0) mappedIdx = achievements.length - 1
  if (mappedIdx == null) return null
  return getTierByRank(mappedIdx + 1, achievements, options)
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

function buildTimelineCutoffs(tiers = [], timeline = []) {
  const cutoffs = []
  if (!Array.isArray(tiers) || !Array.isArray(timeline)) return cutoffs
  const positions = new Array(tiers.length).fill(null)
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]
    if (!tier || !tier.baseline) continue
    const key = normalize(tier.baseline)
    const directIdx = timeline.findIndex(a => !!a && (normalize(a.id) === key || normalize(a.name) === key))
    if (directIdx >= 0) positions[i] = directIdx
  }
  let nextKnown = null
  for (let i = positions.length - 1; i >= 0; i--) {
    if (positions[i] != null) {
      nextKnown = positions[i]
      continue
    }
    if (nextKnown != null) positions[i] = nextKnown
  }
  const lastIdx = timeline.length > 0 ? timeline.length - 1 : null
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] == null && lastIdx != null) positions[i] = lastIdx
    if (positions[i] != null) cutoffs.push({ tier: tiers[i], index: positions[i] })
  }

  cutoffs.sort((a, b) => a.index - b.index)
  return cutoffs
}
