import React from 'react'

export const TIERS = [
  {
    name: 'Trivial', subtitle: 'Tier I', baseline: 'ultiate-destruction',
    gradientStart: '#0b1020', gradientEnd: '#020617',
    borderColor: '#1e293b',
    glowColor: 'rgba(30,41,59,0.03)'
  },

  {
    name: 'Simple', subtitle: 'Tier II', baseline: 'to-the-grave',
    gradientStart: '#111827', gradientEnd: '#030712',
    borderColor: '#334155',
    glowColor: 'rgba(51,65,85,0.05)'
  },

  {
    name: 'Novice', subtitle: 'Tier III', baseline: 'xyz-step-infinity-old',
    gradientStart: '#1e1b4b', gradientEnd: '#020617',
    borderColor: '#6366f1',
    glowColor: 'rgba(99,102,241,0.09)'
  },

  {
    name: 'Moderate', subtitle: 'Tier IV', baseline: 'cataclysm-old',
    gradientStart: '#3b0764', gradientEnd: '#14001f',
    borderColor: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.12)'
  },

  {
    name: 'Challenging', subtitle: 'Tier V', baseline: 'the-ultimate-phase-old',
    gradientStart: '#022c22', gradientEnd: '#00130e',
    borderColor: '#10b981',
    glowColor: 'rgba(16,185,129,0.15)'
  },

  {
    name: 'Demanding', subtitle: 'Tier VI', baseline: 'sonic-wave-72',
    gradientStart: '#064e3b', gradientEnd: '#001a12',
    borderColor: '#34d399',
    glowColor: 'rgba(52,211,153,0.18)'
  },

  {
    name: 'Hard', subtitle: 'Tier VII', baseline: 'bloodlust',
    gradientStart: '#042f2e', gradientEnd: '#001313',
    borderColor: '#22d3ee',
    glowColor: 'rgba(34,211,238,0.22)'
  },

  {
    name: 'Intense', subtitle: 'Tier VIII', baseline: 'crimson-planet',
    gradientStart: '#0c4a6e', gradientEnd: '#020617',
    borderColor: '#38bdf8',
    glowColor: 'rgba(56,189,248,0.26)'
  },

  {
    name: 'Formidable', subtitle: 'Tier IX', baseline: 'zodiac',
    gradientStart: '#1e3a8a', gradientEnd: '#030617',
    borderColor: '#60a5fa',
    glowColor: 'rgba(96,165,250,0.30)'
  },

  {
    name: 'Legendary', subtitle: 'Tier X', baseline: 'the-golden',
    gradientStart: '#78350f', gradientEnd: '#2b0c02',
    borderColor: '#fbbf24',
    glowColor: 'rgba(251,191,36,0.36)'
  },

  {
    name: 'Expert', subtitle: 'Tier XI', baseline: 'tartarus',
    gradientStart: '#9a3412', gradientEnd: '#2a0a02',
    borderColor: '#fb923c',
    glowColor: 'rgba(251,146,60,0.40)'
  },

  {
    name: 'Master', subtitle: 'Tier XII', baseline: 'arcturus',
    gradientStart: '#7f1d1d', gradientEnd: '#120404',
    borderColor: '#ef4444',
    glowColor: 'rgba(239,68,68,0.45)'
  },

  {
    name: 'Mythic', subtitle: 'Tier XIII', baseline: 'edge-of-destiny',
    gradientStart: '#581c87', gradientEnd: '#12001f',
    borderColor: '#d946ef',
    glowColor: 'rgba(217,70,239,0.52)'
  },

  {
    name: 'Epic', subtitle: 'Tier XIV', baseline: 'firework',
    gradientStart: '#86198f', gradientEnd: '#1a0015',
    borderColor: '#f472b6',
    glowColor: 'rgba(244,114,182,0.60)'
  },

  {
    name: 'Endgame', subtitle: 'Tier XV', baseline: 'slaughterhouse',
    gradientStart: '#991b1b', gradientEnd: '#000000',
    borderColor: '#ff3b3b',
    glowColor: 'rgba(255,59,59,0.68)'
  },

  {
    name: 'Ultimate', subtitle: 'Tier XVI', baseline: 'acheron',
    gradientStart: '#020617', gradientEnd: '#000000',
    borderColor: '#7dd3fc',
    glowColor: 'rgba(125,211,252,0.75)'
  },

  {
    name: 'Godlike', subtitle: 'Tier XVII', baseline: 'boobawamba',
    gradientStart: '#ff00aa', gradientEnd: '#1a0010',
    borderColor: '#ff66cc',
    glowColor: 'rgba(255,102,204,0.85)'
  },

  {
    name: 'Transcendent', subtitle: 'Tier XVIII', baseline: 'kocmoc-unleashed',
    gradientStart: '#ffffff', gradientEnd: '#c7d2fe',
    borderColor: '#ffffff',
    glowColor: 'rgba(255,255,255,1)'
  }
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

  if (opts && (opts.enable === false || opts.listType === 'timeline' || opts.mode === 'timeline')) return null

  const idx = rank - 1
  if (idx < 0) return null
  const tiers = (opts && opts.tiers) || TIERS
  const achievementIndex = buildAchievementIndex(achievements, opts.extraLists)
  const cutoffs = mapMasterCutoffsToTimeline(tiers, achievements, opts.extraLists).length > 0
    ? mapMasterCutoffsToTimeline(tiers, achievements, opts.extraLists)
    : buildTierCutoffs(tiers, achievementIndex)

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

  const [useRoman, setUseRoman] = React.useState(true)

  React.useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const v = localStorage.getItem('tiersUseRoman')
      if (v != null) setUseRoman(v === 'true')
      const onStorage = (ev) => {
        if (!ev) return
        if (ev.key === 'tiersUseRoman') {
          try {
            setUseRoman(ev.newValue !== 'false')
          } catch (e) {}
        }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    } catch (e) {}
  }, [])

  function convertSubtitle(sub) {
    if (!sub) return sub
    if (useRoman) return sub
    const map = {
      'I': '1','II': '2','III': '3','IV': '4','V': '5','VI': '6','VII': '7','VIII': '8','IX': '9','X': '10',
      'XI': '11','XII': '12','XIII': '13','XIV': '14','XV': '15','XVI': '16','XVII': '17','XVIII': '18'
    }
    return sub.replace(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII)\b/g, (m) => map[m] || m)
  }

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
        {tier.name} – {convertSubtitle(tier.subtitle)}
      </span>
    </div>
  )
}
