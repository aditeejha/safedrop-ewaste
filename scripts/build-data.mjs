// Builds the app's data files from the verified research in research/ and copies them to web/public/data.
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

for (const guide of wipe.guides) {
  const ids = guide.sections.flatMap((s) => s.steps.map((step) => step.id))
  if (new Set(ids).size !== ids.length) throw new Error(`duplicate step ids in ${guide.id}`)
}

const facts = { facts: research.facts }

await mkdir('data', { recursive: true })
await mkdir('web/public/data', { recursive: true })
await writeFile('data/guides.json', JSON.stringify(wipe, null, 1))
await writeFile('data/impact.json', JSON.stringify(impact, null, 1))
await writeFile('data/facts.json', JSON.stringify(facts, null, 1))

const slim = (r) => ({
  id: r.id,
  name: r.name,
  address: r.address.split(/\s{2,}/)[0],
  state: r.state,
  district: r.district,
  city: r.city,
  pincode: r.pincode,
  capacityTpa: r.capacityTpa,
  phone: r.phone,
  email: r.email,
  type: r.type,
  lat: r.lat,
  lng: r.lng,
  precision: r.geo?.precision ?? null,
  disabled: Boolean(r.operationsDisabled),
})
for (const name of ['recyclers', 'refurbishers']) {
  const rows = await read(`data/${name}.json`)
  await writeFile(`web/public/data/${name}.json`, JSON.stringify(rows.map(slim)))
}
for (const name of ['guides', 'impact', 'facts']) await copyFile(`data/${name}.json`, `web/public/data/${name}.json`)
console.log('data built', Object.keys(materials), wipe.guides.length, 'guides', research.facts.length, 'facts')
