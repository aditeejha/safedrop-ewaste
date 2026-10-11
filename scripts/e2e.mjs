// End-to-end and security checks against the deployed API: node scripts/e2e.mjs [photo.jpg]
// Uses the demo account (all roles) plus a second throwaway account to prove users are isolated.
import './aws-guard.mjs'
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const region = 'ap-south-1'
const outputs = JSON.parse(readFileSync('infra/outputs.json', 'utf8')).SafeDropEwaste
const base = `${outputs.ApiUrl}/api`
const guides = JSON.parse(readFileSync('data/guides.json', 'utf8')).guides
const cognito = new CognitoIdentityProviderClient({ region })
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }))
const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)
const step = (name) => console.log(`✔ ${name}`)

async function signIn(email, password) {
  const auth = await cognito.send(
    new InitiateAuthCommand({ ClientId: outputs.UserPoolClientId, AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: { USERNAME: email, PASSWORD: password } }),
  )
  return auth.AuthenticationResult.IdToken
}

function client(token) {
  return async function call(method, path, json, headers = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(json ? { 'content-type': 'application/json' } : {}), ...headers },
      body: json ? JSON.stringify(json) : undefined,
    })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body, replay: res.headers.get('idempotent-replay') === 'true' }
  }
}

async function ok(promise, expected = [200, 201]) {
  const res = await promise
  assert.ok(expected.includes(res.status), `expected ${expected} got ${res.status} ${JSON.stringify(res.body)}`)
  return res.body
}

const demo = client(await signIn(process.env.DEMO_EMAIL ?? 'demo@example.com', process.env.DEMO_PASSWORD ?? 'SafeDrop@2026'))
const otherEmail = `e2e-${Date.now()}@example.com`
await cognito.send(new AdminCreateUserCommand({ UserPoolId: outputs.UserPoolId, Username: otherEmail, MessageAction: 'SUPPRESS', UserAttributes: [{ Name: 'email', Value: otherEmail }, { Name: 'email_verified', Value: 'true' }, { Name: 'name', Value: 'E2E Other' }] }))
await cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: outputs.UserPoolId, Username: otherEmail, Password: 'Other@12345', Permanent: true }))
const other = client(await signIn(otherEmail, 'Other@12345'))
const anonymous = client(null)

try {
  const me = await ok(demo('GET', '/me'))
  assert.ok(['partner', 'processor', 'admin', 'demo'].every((g) => me.groups.includes(g)))
  step('demo account has partner, processor, admin and demo roles')

  async function attestedPhone(model) {
    const key = randomUUID()
    const phone = await ok(demo('POST', '/me/devices', { kind: 'phone', brand: 'Samsung', model, condition: { powersOn: 'no' } }, { 'idempotency-key': key }))
    const again = await demo('POST', '/me/devices', { kind: 'phone', brand: 'Samsung', model }, { 'idempotency-key': key })
    assert.equal(again.body.id, phone.id, 'retry with the same key returns the same device')
    assert.ok(again.replay)
    const guide = guides.find((g) => g.id === 'samsung')
    const steps = guide.sections.flatMap((s) => s.steps)
    const critical = steps.filter((s) => s.critical)
    assert.equal((await demo('PUT', `/me/devices/${phone.id}/steps/${critical[0].id}`, { state: 'skipped' })).status, 400, 'critical steps cannot be skipped')
    for (const [i, s] of critical.entries()) await ok(demo('PUT', `/me/devices/${phone.id}/steps/${s.id}`, { state: i === critical.length - 1 ? 'na' : 'done' }))
    const optional = steps.find((s) => !s.critical)
    await ok(demo('PUT', `/me/devices/${phone.id}/steps/${optional.id}`, { state: 'skipped' }))
    assert.equal((await demo('POST', `/me/devices/${phone.id}/attest`, { confirm: false, statement: 'attest-1' })).status, 400, 'attestation must be explicit')
    const ready = await ok(demo('POST', `/me/devices/${phone.id}/attest`, { confirm: true, statement: 'attest-1' }))
    assert.equal(ready.status, 'ready')
    assert.equal(ready.wipe.summary.na, 1)
    assert.equal(ready.wipe.summary.skipped, 1)
    assert.equal(ready.recommendation.route, 'recycle')
    return ready
  }

  const partial = await ok(demo('POST', '/me/devices', { kind: 'phone', brand: 'Apple' }))
  await ok(demo('PUT', `/me/devices/${partial.id}/steps/${guides.find((g) => g.id === 'iphone').sections[0].steps[0].id}`, { state: 'done' }))
  const blocked = await demo('POST', `/me/devices/${partial.id}/attest`, { confirm: true, statement: 'attest-1' })
  assert.equal(blocked.status, 409, 'a partial checklist cannot be attested')
  step('partial wipe cannot be attested; critical steps cannot be skipped')

  const phone = await attestedPhone('Galaxy M31 (e2e)')
  step(`wipe self-attested with guide ${phone.wipe.guideVersion} (${phone.wipe.summary.done} done, ${phone.wipe.summary.na} n/a, ${phone.wipe.summary.skipped} skipped)`)
  step('idempotent retry returned the same device')

  assert.equal((await other('GET', `/me/devices/${phone.id}`)).status, 404, 'user B cannot read user A device')
  assert.equal((await other('PUT', `/me/devices/${phone.id}/steps/x`, { state: 'done' })).status, 404)
  assert.equal((await anonymous('GET', '/me/devices')).status, 401)
  assert.equal((await anonymous('GET', '/partner/held')).status, 401, 'unauthenticated partner call')
  assert.equal((await other('GET', '/partner/held')).status, 403, 'non-partner partner call')
  assert.equal((await other('GET', '/processor/dispatches')).status, 403)
  assert.equal((await other('GET', '/admin/collectors')).status, 403)
  step('users are isolated; partner, processor and admin endpoints refuse other users')

  const hazard = await ok(demo('POST', '/me/devices', { kind: 'charger', condition: { battery: 'swollen' } }))
  assert.equal(hazard.recommendation.route, 'battery-hazard')
  assert.equal((await demo('POST', '/me/bookings', { pointId: 'demo-dtu', date: today, deviceIds: [hazard.id] })).status, 409, 'hazard blocked')
  await ok(demo('DELETE', `/me/devices/${hazard.id}`))
  step('swollen battery stops the normal drop-off')

  const booking = await ok(demo('POST', '/me/bookings', { pointId: 'demo-dtu', date: today, deviceIds: [phone.id] }, { 'idempotency-key': randomUUID() }))
  assert.match(booking.qr, /^bk-[0-9a-f]{12}\.[A-Za-z0-9_-]{24}$/)
  assert.equal((await other('GET', `/me/bookings/${booking.id}`)).status, 404)
  step(`booked; code ${booking.code}, signed QR, expires ${booking.expiresAt}`)

  const forged = await demo('GET', `/partner/handover?qr=${booking.id}.AAAAAAAAAAAAAAAAAAAAAAAA`)
  assert.equal(forged.status, 400, 'forged QR rejected')
  const lookup = await ok(demo('GET', `/partner/handover?qr=${encodeURIComponent(booking.qr)}`))
  assert.equal(lookup.devices.length, 1)
  assert.equal((await demo('POST', '/partner/handover', { qr: booking.qr, items: [{ deviceId: phone.id, kg: -1 }] })).status, 400, 'invented weight rejected')
  assert.equal((await demo('POST', '/partner/handover', { qr: booking.qr, items: [{ deviceId: phone.id, kg: 0.2, unit: 'lb' }] })).status, 400, 'unit must be kg')
  const [first, second] = await Promise.all([
    demo('POST', '/partner/handover', { qr: booking.qr, items: [{ deviceId: phone.id, kg: 0.19 }] }),
    demo('POST', '/partner/handover', { code: booking.code, items: [{ deviceId: phone.id, kg: 0.19 }] }),
  ])
  const statuses = [first.status, second.status].sort()
  assert.equal(statuses[0], 201, `one scan wins (${statuses})`)
  assert.ok([404, 409].includes(statuses[1]), `the other is refused (${statuses})`)
  const cert = (first.status === 201 ? first : second).body
  assert.equal((await demo('POST', '/partner/handover', { qr: booking.qr, items: [{ deviceId: phone.id, kg: 0.19 }] })).status, 409, 'replay refused')
  step(`simultaneous double scan: exactly one handover (${statuses.join(' / ')}); replay refused`)

  const held = await ok(demo('GET', '/partner/held'))
  assert.ok(held.some((d) => d.id === phone.id))
  await ok(demo('POST', '/partner/corrections', { deviceId: phone.id, kg: 0.186, reason: 'Re-weighed without the case' }))
  step('weight corrected with an audited reason')

  const facilities = await ok(anonymous('GET', '/facilities'))
  const dispatch = await ok(demo('POST', '/partner/dispatches', { deviceIds: [phone.id], facility: { type: 'onboarded', id: facilities[0].id }, reference: 'E2E-MANIFEST-1' }))
  assert.equal((await demo('POST', '/partner/dispatches', { deviceIds: [phone.id], facility: { type: 'onboarded', id: facilities[0].id }, reference: 'again' })).status, 409, 'cannot dispatch twice')
  assert.equal((await demo('POST', `/processor/dispatches/${dispatch.id}/confirm`, { evidence: '' })).status, 400, 'evidence required')
  await ok(demo('POST', `/processor/dispatches/${dispatch.id}/confirm`, { evidence: 'DEMO-RECEIPT-001' }))
  step('dispatched to a facility and confirmed with evidence')

  const verify = await ok(anonymous('GET', `/certificates/${cert.id}`))
  const trail = verify.trails[0]
  assert.equal(trail.intact, true)
  assert.equal(trail.stage, 'processed')
  assert.deepEqual(
    trail.events.map((e) => e.type),
    ['device.added', 'wipe.started', 'wipe.attested', 'handover.booked', 'handover.received', 'weight.corrected', 'dispatch.sent', 'processing.confirmed'],
  )
  assert.equal(verify.userId, undefined)
  assert.equal(verify.items[0].kg, 0.186)
  step(`certificate verifies: ${trail.events.length} hash-linked events, chain intact, stage ${trail.stage}`)

  const pickupPhone = await attestedPhone('Galaxy A12 (pickup e2e)')
  const pickup = await ok(demo('POST', '/me/bookings', { pointId: 'demo-dtu', date: today, deviceIds: [pickupPhone.id], mode: 'pickup', pickup: { address: 'House 12, Sector 28, Rohini, Delhi', pincode: '110042', phone: '9876543210' } }))
  const requests = await ok(demo('GET', '/me/collector/requests'))
  assert.ok(requests.some((r) => r.id === pickup.id && r.address === undefined), 'address hidden before accepting')
  await ok(demo('POST', `/me/collector/pickups/${pickup.id}/accept`))
  assert.equal((await demo('GET', `/partner/handover?code=${pickup.code}`)).status, 409, 'not collected yet')
  assert.equal((await demo('POST', `/me/collector/pickups/${pickup.id}/collect`, { code: 'AAAAAA' })).status, 400)
  await ok(demo('POST', `/me/collector/pickups/${pickup.id}/collect`, { code: pickup.code }))
  const pickupCert = await ok(demo('POST', '/partner/handover', { code: pickup.code, items: [{ deviceId: pickupPhone.id, kg: 0.17 }] }))
  assert.equal(pickupCert.collectorName, 'Ramesh Kumar (Demo)')
  step('kabadiwala pickup: request → accept → collect with code → drop point receipt')

  const expiring = await attestedPhone('Galaxy expiry (e2e)')
  const late = await ok(demo('POST', '/me/bookings', { pointId: 'demo-dtu', date: today, deviceIds: [expiring.id] }))
  await db.send(new UpdateCommand({ TableName: outputs.TableName, Key: { pk: `BOOKING#${late.id}`, sk: 'META' }, UpdateExpression: 'SET expiresAt = :past', ExpressionAttributeValues: { ':past': '2020-01-01T00:00:00.000Z' } }))
  assert.equal((await demo('GET', `/partner/handover?code=${late.code}`)).status, 410, 'expired code refused')
  await ok(demo('POST', `/me/bookings/${late.id}/cancel`))
  step('expired handover code refused')

  const answer = await ok(demo('POST', '/ask', { question: 'What should I do with a swollen battery?' }))
  assert.ok(answer.sources.length > 0)
  assert.ok(answer.actions.some((a) => a.type === 'battery-safety'))
  step(`helper answered via ${answer.engine} with ${answer.sources.length} source(s) and actions ${answer.actions.map((a) => a.type).join(', ')}`)

  const photoPath = process.argv[2]
  if (photoPath) {
    const upload = await ok(demo('POST', '/me/photos', { contentType: 'image/jpeg' }))
    const form = new FormData()
    for (const [k, v] of Object.entries(upload.fields)) form.append(k, v)
    form.append('file', new Blob([readFileSync(photoPath)], { type: 'image/jpeg' }))
    const post = await fetch(upload.url, { method: 'POST', body: form })
    assert.ok(post.ok, `S3 upload ${post.status}`)
    const big = new FormData()
    for (const [k, v] of Object.entries((await ok(demo('POST', '/me/photos', { contentType: 'image/jpeg' }))).fields)) big.append(k, v)
    big.append('file', new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/jpeg' }))
    assert.equal((await fetch(upload.url, { method: 'POST', body: big })).status, 400, 'S3 refuses files over 5 MB')
    const id = await ok(demo('POST', '/me/photos/identify', { key: upload.key }))
    step(`photo upload (5 MB limit enforced by S3) identified by ${id.engine}: ${id.kind}`)
  }

  const stats = await ok(anonymous('GET', '/stats'))
  assert.equal(stats.devicesCollected, 0, 'demo handovers never reach public totals')
  assert.ok(stats.demo.devicesCollected >= 2 && stats.demo.devicesProcessed >= 1)
  step(`public totals untouched by demo; demo ledger: ${stats.demo.devicesCollected} collected, ${stats.demo.kgWeighed} kg weighed, ${stats.demo.devicesProcessed} processed`)
} finally {
  await cognito.send(new AdminDeleteUserCommand({ UserPoolId: outputs.UserPoolId, Username: otherEmail }))
}
