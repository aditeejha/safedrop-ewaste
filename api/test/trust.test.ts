import assert from 'node:assert/strict'
import { test } from 'node:test'
import { suggestActions } from '../src/lib/assistant.js'
import { codeKey, qrPayload, readQrPayload } from '../src/lib/codes.js'
import { canMoveBooking, canMoveDevice } from '../src/lib/lifecycle.js'
import { decideRoute, readCondition } from '../src/lib/route.js'
import { firstJsonObject } from '../src/lib/vision.js'
import { genesisHash, nextEvent, verifyTrail, type TrailEvent } from '../src/lib/trail.js'

test('devices only move along the allowed lifecycle', () => {
  assert.ok(canMoveDevice('added', 'wiping'))
  assert.ok(canMoveDevice('wiping', 'ready'))
  assert.ok(canMoveDevice('ready', 'booked'))
  assert.ok(canMoveDevice('booked', 'received'))
  assert.ok(canMoveDevice('received', 'dispatched'))
  assert.ok(canMoveDevice('dispatched', 'processed'))
  assert.equal(canMoveDevice('added', 'received'), false, 'cannot skip the wipe and booking')
  assert.equal(canMoveDevice('ready', 'processed'), false, 'cannot jump to processed')
  assert.equal(canMoveDevice('received', 'processed'), false, 'processing needs a dispatch first')
  assert.equal(canMoveDevice('processed', 'received'), false, 'no going back')
  assert.equal(canMoveBooking('received', 'received'), false, 'a handover is confirmed once')
  assert.equal(canMoveBooking('collected', 'cancelled'), false)
})

function chain(deviceId: string, types: string[]) {
  let head = { trailSeq: 0, trailHash: genesisHash(deviceId) }
  const events: TrailEvent[] = []
  for (const type of types) {
    const event = nextEvent(head, { type, deviceId, actorRole: 'owner', actorRef: 'abc', demo: false })
    events.push(event)
    head = { trailSeq: event.seq, trailHash: event.hash }
  }
  return events
}

test('the trail is hash-linked and detects edits, deletions and reordering', () => {
  const events = chain('dev-1', ['device.added', 'wipe.started', 'wipe.attested', 'handover.booked', 'handover.received'])
  assert.deepEqual(verifyTrail('dev-1', events), { intact: true, brokenAt: null })
  const edited = events.map((e) => (e.seq === 5 ? { ...e, weightKg: 99 } : e))
  assert.equal(verifyTrail('dev-1', edited).intact, false)
  assert.equal(verifyTrail('dev-1', events.filter((e) => e.seq !== 3)).brokenAt, 3)
  assert.equal(verifyTrail('dev-2', events).intact, false, 'a trail cannot be moved to another device')
})

test('QR payloads are signed and codes are stored only as hashes', () => {
  const payload = qrPayload('bk-0123456789ab', 'secret-one')
  assert.equal(readQrPayload(payload, 'secret-one'), 'bk-0123456789ab')
  assert.equal(readQrPayload(payload, 'secret-two'), null, 'wrong key')
  assert.equal(readQrPayload('bk-0123456789ac.' + payload.split('.')[1], 'secret-one'), null, 'signature tied to booking')
  assert.equal(readQrPayload('not-a-payload', 'secret-one'), null)
  assert.match(codeKey('ABC234'), /^CODE#[0-9a-f]{64}$/)
  assert.ok(!codeKey('ABC234').includes('ABC234'))
})

test('reuse-first routing never guesses', () => {
  assert.equal(decideRoute(undefined, true).route, 'not-enough-info')
  assert.equal(decideRoute({ battery: 'swollen', powersOn: 'yes' }, true).route, 'battery-hazard')
  assert.equal(decideRoute({ powersOn: 'no' }, true).route, 'recycle')
  assert.equal(decideRoute({ powersOn: 'yes', screenWorks: 'yes', accountLocked: 'unknown', damage: 'none', battery: 'ok' }, true).route, 'not-enough-info')
  assert.equal(decideRoute({ powersOn: 'yes', screenWorks: 'yes', accountLocked: 'yes', damage: 'none', battery: 'ok' }, true).route, 'recycle')
  assert.equal(decideRoute({ powersOn: 'yes', screenWorks: 'yes', accountLocked: 'no', damage: 'minor', battery: 'ok' }, true).route, 'reuse')
  assert.equal(decideRoute({ powersOn: 'yes', damage: 'none', battery: 'ok' }, false).route, 'reuse')
  assert.deepEqual(readCondition({ powersOn: 'maybe', battery: 'swollen', extra: 1 }), { battery: 'swollen' })
})

test('helper actions come from rules, not the model', () => {
  const kinds = (q: string) => suggestActions(q, []).map((a) => a.type)
  assert.ok(kinds('My battery looks swollen').includes('battery-safety'))
  assert.ok(kinds('Where can I recycle my old laptop?').includes('find-recyclers'))
  assert.ok(kinds('Can a kabadiwala pick it up from home?').includes('prepare-pickup'))
  assert.deepEqual(kinds('hello'), [])
  assert.deepEqual(suggestActions('reset', [], 'android')[0], { type: 'open-guide', guideId: 'android', title: 'Android phone or tablet (Android 12 and newer)' })
})

test('model replies are read up to the first complete JSON object', () => {
  assert.deepEqual(firstJsonObject('{"kind":"phone","notes":"a } in text"}\n{"kind":"laptop"}'), { kind: 'phone', notes: 'a } in text' })
  assert.deepEqual(firstJsonObject('Here you go: {"a":{"b":"\\"x\\""}} thanks'), { a: { b: '"x"' } })
  assert.throws(() => firstJsonObject('no json here'))
})
