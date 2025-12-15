import React from 'react'
import fs from 'fs'
import path from 'path'

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'public', 'achievements.json')
  let raw = '[]'
  try {
    raw = fs.readFileSync(filePath, 'utf8')
  } catch (e) {
    raw = '[]'
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    data = raw
  }
  return { props: { raw, data } }
}

const TIERS = [
  { name: 'Tier I (Endgame)', count: 20 },
  { name: 'Tier II (Master)', count: 30 },
  { name: 'Tier III (Expert)', count: 40 },
  { name: 'Tier IV (Advanced)', count: 60 },
  { name: 'Tier V (Intermediate)', count: 80 },
  { name: 'Tier VI (Developing)', count: 120 },
  { name: 'Tier VII (Entry)', count: 150 },
]

export default function TestingPage({ data }) {
  const items = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' ? (data.achievements || data.items || []) : [])

  const groups = []
  let start = 0
  for (const tier of TIERS) {
    const slice = items.slice(start, start + tier.count)
    groups.push({ ...tier, items: slice })
    start += tier.count
  }

  const remainder = items.slice(start)

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, Arial, sans-serif' }}>
      <h1>Achievements — Testing Page</h1>
      <p>Source: <strong>/public/achievements.json</strong> — split sequentially by tier counts.</p>

      {groups.map((g, i) => (
        <section key={i} style={{ marginBottom: 24 }}>
          <h2>{g.name} — {g.items.length} items</h2>
          <ul style={{ background: '#f7f7f7', padding: 12, overflowX: 'auto', listStyle: 'none', margin: 0 }}>
            {g.items.map((it, idx) => (
              <li key={idx} style={{ padding: '4px 0' }}>{getAchievementName(it)}</li>
            ))}
          </ul>
        </section>
      ))}

      {remainder.length > 0 && (
        <section>
          <h2>Remaining — {remainder.length} items</h2>
          <ul style={{ background: '#f7f7f7', padding: 12, overflowX: 'auto', listStyle: 'none', margin: 0 }}>
            {remainder.map((it, idx) => (
              <li key={idx} style={{ padding: '4px 0' }}>{getAchievementName(it)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function getAchievementName(item) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return String(item)
  if (item.name) return item.name
  if (item.title) return item.title
  if (item.label) return item.label
  if (item.text) return item.text
  if (item.achievement && (item.achievement.name || item.achievement.title)) return item.achievement.name || item.achievement.title
  return JSON.stringify(item)
}
