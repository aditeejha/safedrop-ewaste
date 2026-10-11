import type { Site } from './types'

export type NameMatch = { site: Site; score: number; level: 'exact' | 'strong' | 'partial' }

const legal = /\b(pvt|private|ltd|limited|llp|co|company|india|the|m s|ms|and)\b/g

export function normaliseName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(legal, ' ').replace(/\s+/g, ' ').trim()
}

// A name match is evidence that a similar name appears in the official list, never proof that
// the person in front of you represents that company. The UI says so next to every result.
export function matchName(query: string, sites: Site[], limit = 5): NameMatch[] {
  const q = normaliseName(query)
  if (q.length < 3) return []
  const qTokens = new Set(q.split(' '))
  const matches: NameMatch[] = []
  for (const site of sites) {
    const name = normaliseName(site.name)
    if (!name) continue
    if (name === q) {
      matches.push({ site, score: 1, level: 'exact' })
      continue
    }
    const tokens = new Set(name.split(' '))
    const shared = [...qTokens].filter((t) => tokens.has(t)).length
    const overlap = shared / new Set([...qTokens, ...tokens]).size
    if (name.includes(q) || q.includes(name)) matches.push({ site, score: Math.max(0.75, overlap), level: 'strong' })
    else if (overlap >= 0.5) matches.push({ site, score: overlap, level: 'partial' })
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, limit)
}
