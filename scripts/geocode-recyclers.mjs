// Geocodes the CPCB recycler/refurbisher lists with Amazon Location Service (Places v2).
// Results are stored, so every call uses IntendedUse=Storage as the service terms require.
import './aws-guard.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { GeoPlacesClient, GeocodeCommand } from '@aws-sdk/client-geo-places'

const client = new GeoPlacesClient({ region: 'ap-south-1' })
const MAX_KM_FROM_PINCODE = 25

async function geocode(input) {
  const res = await client.send(
    new GeocodeCommand({ ...input, Filter: { IncludeCountries: ['IND'] }, IntendedUse: 'Storage', MaxResults: 1, Language: 'en' }),
  )
  const item = res.ResultItems?.[0]
  if (!item?.Position) return null
  return {
    lng: item.Position[0],
    lat: item.Position[1],
    placeType: item.PlaceType,
    label: item.Address?.Label ?? item.Title,
    region: item.Address?.Region?.Name ?? '',
    postalCode: item.Address?.PostalCode ?? '',
    score: item.MatchScores?.Overall ?? null,
  }
}

function km(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

function sameState(region, state) {
  const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
  return norm(region).includes(norm(state).slice(0, 6)) || norm(state).includes(norm(region).slice(0, 6))
}

function cleanAddress(record) {
  const head = record.address.split(/\s{2,}/)[0]
  return `${head.slice(0, 170)}, ${record.state}, India`
}

async function locate(record) {
  const pin = record.pincode ? await geocode({ QueryComponents: { PostalCode: record.pincode, Country: 'IND' } }) : null
  const pinOk = pin && sameState(pin.region, record.state)
  const addr = await geocode({ QueryText: cleanAddress(record) }).catch(() => null)
  if (addr && sameState(addr.region, record.state) && (!pinOk || km(addr, pin) <= MAX_KM_FROM_PINCODE)) {
    return { ...addr, precision: ['PointAddress', 'InterpolatedAddress', 'Street', 'PointOfInterest'].includes(addr.placeType) ? 'address' : 'area' }
  }
  if (pinOk) return { ...pin, precision: 'pincode' }
  const district = await geocode({ QueryText: `${record.district}, ${record.state}, India` })
  if (district && sameState(district.region, record.state)) return { ...district, precision: 'district' }
  return null
}

async function run(file, out) {
  const records = JSON.parse(await readFile(file, 'utf8'))
  const previous = new Map()
  try {
    for (const row of JSON.parse(await readFile(out, 'utf8'))) if (row.lat !== null) previous.set(row.id, row)
  } catch {}
  const results = []
  const counts = {}
  for (const [i, record] of records.entries()) {
    const done = previous.get(record.id)
    if (done) {
      counts[done.geo.precision] = (counts[done.geo.precision] ?? 0) + 1
      results.push(done)
      continue
    }
    let geo = null
    try {
      geo = await locate(record)
    } catch (err) {
      console.error(`  ${record.id}: ${err.name} ${err.message}`)
    }
    counts[geo?.precision ?? 'none'] = (counts[geo?.precision ?? 'none'] ?? 0) + 1
    results.push({
      ...record,
      lat: geo ? Number(geo.lat.toFixed(6)) : null,
      lng: geo ? Number(geo.lng.toFixed(6)) : null,
      geo: geo ? { precision: geo.precision, placeType: geo.placeType, label: geo.label, score: geo.score, provider: 'Amazon Location Service' } : null,
    })
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${records.length}`, counts)
  }
  await writeFile(out, JSON.stringify(results, null, 1))
  console.log(out, records.length, counts)
}

await run('research/recyclers.json', 'data/recyclers.json')
await run('research/refurbishers.json', 'data/refurbishers.json')
