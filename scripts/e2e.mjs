// End-to-end check against the deployed API: node scripts/e2e.mjs [photo.jpg]
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const outputs = JSON.parse(readFileSync('infra/outputs.json', 'utf8')).SafeDropEwaste
const base = `${outputs.ApiUrl}/api`
const guides = JSON.parse(readFileSync('data/guides.json', 'utf8')).guides
const cognito = new CognitoIdentityProviderClient({ region: 'ap-south-1' })

const auth = await cognito.send(
  new InitiateAuthCommand({
    ClientId: outputs.UserPoolClientId,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: process.env.DEMO_EMAIL ?? 'demo@example.com', PASSWORD: process.env.DEMO_PASSWORD ?? 'SafeDrop@2026' },
  }),
)
const token = auth.AuthenticationResult.IdToken

async function call(method, path, json) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(json ? { 'content-type': 'application/json' } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(body)}`)
  return body
}

const step = (name) => console.log(`✔ ${name}`)
const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)

const me = await call('GET', '/me')
assert.ok(me.groups.includes('partner'))
step(`signed in as ${me.name} (partner of ${me.pointId})`)

async function wipedPhone(label) {
  const phone = await call('POST', '/me/devices', { kind: 'phone', brand: 'Samsung', model: label })
  assert.equal(phone.guideId, 'samsung')
  const guide = guides.find((g) => g.id === 'samsung')
  const critical = guide.sections.flatMap((s) => s.steps.filter((x) => x.critical).map((x) => x.id))
  await assert.rejects(call('POST', `/me/devices/${phone.id}/wiped`), /critical/)
  for (const id of critical) await call('PUT', `/me/devices/${phone.id}/steps/${id}`, { done: true })
  const wiped = await call('POST', `/me/devices/${phone.id}/wiped`)
  assert.equal(wiped.status, 'ready')
  return wiped
}

const phone = await wipedPhone('Galaxy M31 (e2e)')
step(`phone wiped after ${Object.keys(phone.steps).length} critical steps; marking wiped early was refused`)
const charger = await call('POST', '/me/devices', { kind: 'charger', brand: 'Generic' })
assert.equal(charger.status, 'ready')
step('charger is ready without a wipe')

const booking = await call('POST', '/me/bookings', { pointId: 'demo-dtu', date: today, deviceIds: [phone.id, charger.id] })
assert.match(booking.code, /^[A-Z2-9]{6}$/)
step(`drop-off booked, code ${booking.code}`)

const lookup = await call('GET', `/partner/handover/${booking.code}`)
assert.equal(lookup.devices.length, 2)
const cert = await call('POST', `/partner/handover/${booking.code}`, {
  items: [
    { deviceId: phone.id, kg: 0.19 },
    { deviceId: charger.id, kg: 0.06 },
  ],
})
assert.ok(cert.totals.co2eKg > 0 && cert.totals.energyKwh > 0)
step(`handover confirmed: ${cert.totals.kg} kg, ${cert.totals.co2eKg} kg CO2e, ${cert.totals.energyKwh} kWh, gold ${cert.totals.metalsGrams.gold} g`)

const publicCert = await (await fetch(`${base}/certificates/${cert.id}`)).json()
assert.equal(publicCert.verified, true)
assert.equal(publicCert.userId, undefined)
step(`public certificate verifies for ${publicCert.holderName}`)
await assert.rejects(call('GET', `/partner/handover/${booking.code}`), /404|already/)
step('used code cannot be reused')

const pickupPhone = await wipedPhone('Galaxy A12 (pickup e2e)')
const pickup = await call('POST', '/me/bookings', {
  pointId: 'demo-dtu',
  date: today,
  deviceIds: [pickupPhone.id],
  mode: 'pickup',
  pickup: { address: 'House 12, Sector 28, Rohini, Delhi', pincode: '110042', phone: '9876543210' },
})
const requests = await call('GET', '/me/collector/requests')
assert.ok(requests.some((r) => r.id === pickup.id && r.address === undefined))
await call('POST', `/me/collector/pickups/${pickup.id}/accept`)
await assert.rejects(call('GET', `/partner/handover/${pickup.code}`), /collected/)
await assert.rejects(call('POST', `/me/collector/pickups/${pickup.id}/collect`, { code: 'AAAAAA' }), /match/)
await call('POST', `/me/collector/pickups/${pickup.id}/collect`, { code: pickup.code })
const pickupCert = await call('POST', `/partner/handover/${pickup.code}`, { items: [{ deviceId: pickupPhone.id, kg: 0.17 }] })
assert.equal(pickupCert.collectorName, 'Ramesh Kumar (Demo)')
step('kabadiwala pickup: request → accept → collect with code → drop point certificate')

const answer = await call('POST', '/ask', { question: 'How do I remove my Google account before a factory reset?', guideId: 'android' })
assert.ok(answer.answer.length > 20)
step(`helper answered via ${answer.engine} with ${answer.sources.length} source(s)`)

const photoPath = process.argv[2]
if (photoPath) {
  const upload = await call('POST', '/me/photos', { contentType: 'image/jpeg' })
  const put = await fetch(upload.url, { method: 'PUT', body: readFileSync(photoPath), headers: { 'content-type': 'image/jpeg' } })
  assert.ok(put.ok, `S3 upload ${put.status}`)
  const id = await call('POST', '/me/photos/identify', { key: upload.key })
  step(`photo identified by ${id.engine}: ${id.kind} ${id.brand ?? ''} ${id.model ?? ''} (battery ${id.batteryRisk}, ${Math.round(id.confidence * 100)}%)`)
}

const stats = await (await fetch(`${base}/stats`)).json()
step(`stats: ${JSON.stringify(stats)}`)
