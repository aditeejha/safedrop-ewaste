// Builds the app's data files from the verified research in research/ and copies them to web/public/data.
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'

const read = async (path) => JSON.parse(await readFile(path, 'utf8'))
const research = await read('research/facts.json')
const warmEnergy = await read('research/warm-energy.json')
const wipe = await read('research/wipe-guides.json')

const warmSource = {
  title: 'WARM v16 Electronics chapter (EPA-530-R-23-022), Exhibit 1-5',
  publisher: 'U.S. Environmental Protection Agency',
  date: '2023-12',
  url: 'https://www.epa.gov/system/files/documents/2023-12/warm_electronics_v16_dec.pdf',
}
const weightSource = {
  title: 'E-waste Statistics: Guidelines on Classification, Reporting and Indicators, 2nd ed. (average weight per piece, EU-28, 2016)',
  publisher: 'United Nations University (Forti, Baldé, Kuehr 2018), reproduced by UNEP',
  date: '2018',
  url: 'https://sdgs.unep.org/article/annex-v-indication-average-weight-electric-and-electronic-equipment-eu-28-kgpiece',
}
const metalSource = {
  title: 'Fact Sheet 2006-3097: Recycled Cell Phones, a Treasure Trove of Valuable Metals (Table 1)',
  publisher: 'U.S. Geological Survey',
  date: '2006-07',
  url: 'https://pubs.usgs.gov/fs/2006/3097/fs2006-3097.pdf',
}

const materials = Object.fromEntries(
  research.warmFactors.map((f) => [
    f.material.replace(/\s*\(.*\)$/, ''),
    { recycling: f.recyclingMtco2ePerShortTon, landfilling: f.landfillingMtco2ePerShortTon },
  ]),
)

const weightByKey = (key) => {
  const row = research.deviceWeights.find((w) => w.category.includes(key))
  if (!row) throw new Error(`missing weight ${key}`)
  return { kg: row.kg, basis: row.category }
}

const energySource = {
  title: 'WARM v16 Management Practices Chapters, Chapter 7: Energy Impacts, Exhibit 7-12',
  publisher: 'U.S. Environmental Protection Agency',
  date: '2023-12',
  url: warmEnergy.source.url,
}

const impact = {
  warm: { unit: 'metric tonnes CO2e per short ton', source: warmSource, materials },
  energy: {
    unit: 'million Btu per short ton',
    source: energySource,
    materials: warmEnergy.materials,
    kwhPerMillionBtu: warmEnergy.conversion.kwh_per_million_btu,
    conversionSource: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8',
    sourceReductionPortable: -163.36,
    ledBulbWatts: 9,
  },
  kindMaterial: {
    phone: 'Portable Electronic Devices',
    'feature-phone': 'Portable Electronic Devices',
    tablet: 'Portable Electronic Devices',
    laptop: 'Portable Electronic Devices',
    smartwatch: 'Portable Electronic Devices',
    desktop: 'Desktop CPUs',
    monitor: 'Flat-Panel Displays',
    tv: 'Flat-Panel Displays',
    printer: 'Hard-Copy Devices',
    router: 'Mixed Electronics',
    storage: 'Mixed Electronics',
    earphones: 'Mixed Electronics',
    charger: 'Mixed Electronics',
    other: 'Mixed Electronics',
  },
  typicalKg: {
    phone: weightByKey('UNU-KEY 0306'),
    'feature-phone': weightByKey('UNU-KEY 0306'),
    tablet: weightByKey('UNU-KEY 0303'),
    laptop: weightByKey('UNU-KEY 0303'),
    desktop: weightByKey('UNU-KEY 0302'),
    printer: weightByKey('UNU-KEY 0304'),
    monitor: weightByKey('UNU-KEY 0309'),
    tv: weightByKey('UNU-KEY 0408'),
    router: weightByKey('UNU-KEY 0301'),
    storage: weightByKey('UNU-KEY 0301'),
    earphones: weightByKey('UNU-KEY 0401'),
  },
  typicalKgSource: weightSource,
  phoneMetals: {
    gramsPerPhone: { copper: 16, silver: 0.35, gold: 0.034, palladium: 0.015 },
    basis: 'A typical 113 g cell phone, excluding battery and charger',
    source: metalSource,
  },
}

for (const material of new Set(Object.values(impact.kindMaterial))) {
  if (!materials[material]) throw new Error(`no WARM factor for ${material}`)
  if (!warmEnergy.materials[material]) throw new Error(`no WARM energy factor for ${material}`)
}

const reviewedAt = wipe.generatedAt.slice(0, 10)
for (const guide of wipe.guides) {
  const ids = guide.sections.flatMap((s) => s.steps.map((step) => step.id))
  if (new Set(ids).size !== ids.length) throw new Error(`duplicate step ids in ${guide.id}`)
  // A guide's version changes whenever its steps or sources change, so wipe records can name the exact text used.
  const digest = createHash('sha256').update(JSON.stringify(guide.sections)).digest('hex').slice(0, 8)
  guide.version = `${reviewedAt}.${digest}`
  guide.reviewedAt = reviewedAt
}

impact.version = { formula: 'safedrop-impact-1', factors: 'US EPA WARM v16 (Dec 2023)', weights: 'UNU 2018 (prefill only)' }

const facts = { facts: research.facts }

await mkdir('data', { recursive: true })
await mkdir('web/public/data', { recursive: true })
await writeFile('data/guides.json', JSON.stringify(wipe, null, 1))
await writeFile('data/impact.json', JSON.stringify(impact, null, 1))
await writeFile('data/facts.json', JSON.stringify(facts, null, 1))

// Directory clean-up: drop test and disabled rows, merge repeat registrations of one site, flag look-alikes for review.
const source = { name: 'CPCB E-Waste EPR portal, registration-granted list', url: 'https://eprewaste.cpcb.gov.in/', checkedAt: '2026-10-10' }
const testNames = new Set(['recycler test', 'recycler test 2'])
const precisionRank = { address: 0, area: 1, pincode: 2, district: 3 }
const locationLabel = {
  address: 'Street address (geocoded)',
  area: 'Locality (geocoded)',
  pincode: 'Approximate: pincode centre',
  district: 'Approximate: district centre',
}
const normalise = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(pvt|private|ltd|limited|llp|co|company|india|the|m s)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const excluded = []
const groups = new Map()
for (const name of ['recyclers', 'refurbishers']) {
  for (const r of await read(`data/${name}.json`)) {
    if (testNames.has(r.name.trim().toLowerCase())) {
      excluded.push({ name: r.name, type: r.type, address: r.address.split(/\s{2,}/)[0], reason: 'Test entry in the portal list (placeholder name and address)' })
      continue
    }
    if (r.operationsDisabled) {
      excluded.push({ name: r.name, type: r.type, address: r.address.split(/\s{2,}/)[0], reason: 'Marked "operations disabled" on the portal' })
      continue
    }
    const key = `${r.type}|${normalise(r.name)}|${r.pincode ?? r.district}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
}

const sites = [...groups.values()].map((rows) => {
  rows.sort((a, b) => Number(a.cpcbId) - Number(b.cpcbId))
  const best = [...rows].sort((a, b) => (precisionRank[a.geo?.precision] ?? 9) - (precisionRank[b.geo?.precision] ?? 9))[0]
  const precision = best.geo?.precision ?? null
  return {
    id: rows[0].id,
    name: rows[0].name,
    type: rows[0].type,
    address: best.address.split(/\s{2,}/)[0],
    state: rows[0].state,
    district: rows[0].district,
    city: rows[0].city,
    pincode: rows[0].pincode,
    capacityTpa: rows.some((r) => r.capacityTpa !== null) ? rows.reduce((t, r) => t + (r.capacityTpa ?? 0), 0) : null,
    registrations: rows.map((r) => ({ portalId: r.cpcbId, capacityTpa: r.capacityTpa })),
    phone: rows.find((r) => r.phone)?.phone ?? null,
    email: rows.find((r) => r.email)?.email ?? null,
    lat: best.lat,
    lng: best.lng,
    location: precision ? { precision, label: locationLabel[precision], approximate: precision === 'pincode' || precision === 'district' } : null,
    source,
  }
})

const byName = new Map()
for (const site of sites) {
  const key = `${site.type}|${normalise(site.name)}|${site.district}`
  if (!byName.has(key)) byName.set(key, [])
  byName.get(key).push(site)
}
const review = [...byName.values()].filter((list) => list.length > 1)
const merged = sites.filter((s) => s.registrations.length > 1)

await writeFile('data/sites.json', JSON.stringify({ source, sites }, null, 1))
await writeFile('web/public/data/sites.json', JSON.stringify({ source, sites }))
const audit = [
  '# Directory audit',
  '',
  `Built by scripts/build-data.mjs from the CPCB lists checked on ${source.checkedAt}.`,
  '',
  `- Rows in the portal lists: ${sites.reduce((t, s) => t + s.registrations.length, 0) + excluded.length}`,
  `- Excluded: ${excluded.length}`,
  `- Sites after merging repeat registrations (same name and pincode): ${sites.length} (${sites.filter((s) => s.type === 'recycler').length} recyclers, ${sites.filter((s) => s.type === 'refurbisher').length} refurbishers)`,
  `- Sites with more than one registration: ${merged.length}`,
  `- Approximate locations (pincode or district centre): ${sites.filter((s) => s.location?.approximate).length}`,
  '',
  '## Excluded rows',
  '',
  ...excluded.map((e) => `- ${e.name} (${e.type}), ${e.address}: ${e.reason}`),
  '',
  '## Merged sites',
  '',
  ...merged.map((s) => `- ${s.name}, ${s.district} ${s.pincode ?? ''}: portal ids ${s.registrations.map((r) => r.portalId).join(', ')}`),
  '',
  '## Needs human review (same name and district, different pincode; kept separate)',
  '',
  ...review.map((list) => `- ${list[0].name}, ${list[0].district}: ${list.map((s) => s.pincode).join(', ')}`),
  '',
]
await writeFile('research/directory-audit.md', audit.join('\n'))

for (const name of ['guides', 'impact', 'facts']) await copyFile(`data/${name}.json`, `web/public/data/${name}.json`)
console.log('data built:', wipe.guides.length, 'guides,', research.facts.length, 'facts,', sites.length, 'sites,', excluded.length, 'excluded,', merged.length, 'merged,', review.length, 'to review')
