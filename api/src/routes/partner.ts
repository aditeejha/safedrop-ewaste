import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import { Hono } from 'hono'
import sitesData from '../../../data/sites.json'
import type { AppEnv } from '../auth.js'
import { db, getItem, queryAll, strip, TableName } from '../db.js'
import { codeKey, isHandoverCode, newId, readQrPayload } from '../lib/codes.js'
import { idempotent } from '../lib/idempotency.js'
import { impactEntry, impactVersion, itemImpact, sumImpact, typicalKg } from '../lib/impact.js'
import { cancellationReasons, moveDevice, statsUpdate, type TransactItem } from '../lib/journey.js'
import { log } from '../lib/log.js'
import { qrSecret } from '../lib/secrets.js'
import { actorRef } from '../lib/trail.js'
import type { Booking, Certificate, CertificateItem, Device, Dispatch, Facility, Point } from '../types.js'
import { loadBooking } from './bookings.js'
import { loadDevice } from './devices.js'

export const partner = new Hono<AppEnv>()

const sites = (sitesData as { sites: { id: string; name: string; type: string }[] }).sites
const correctionWindowMs = 48 * 3600_000

type Resolved = { booking: Booking & Record<string, unknown> } | { error: string; status: 400 | 404 | 409 | 410 }

function reject(reason: string, pointId: string, error: string, status: 400 | 404 | 409 | 410): Resolved {
  log('handover_rejected', { reason, pointId })
  return { error, status }
}

// Resolves a handover from the 6-character code or the signed QR, and refuses forged, expired,
// replayed, wrong-point or not-yet-collected handovers before anything is written.
async function resolveHandover(input: { code?: string; qr?: string }, pointId: string): Promise<Resolved> {
  let bookingId: string | null = null
  if (input.qr) {
    bookingId = readQrPayload(input.qr, await qrSecret())
    if (!bookingId) return reject('forged-qr', pointId, 'This QR code is not a valid SafeDrop handover code.', 400)
  } else {
    const code = (input.code ?? '').toUpperCase()
    if (!isHandoverCode(code)) return reject('bad-format', pointId, 'Codes are 6 letters and numbers.', 400)
    const ref = await getItem<{ bookingId: string }>(codeKey(code), 'META')
    if (!ref) return reject('unknown-code', pointId, 'No active booking uses this code. It may already have been used.', 404)
    bookingId = ref.bookingId
  }
  const booking = await loadBooking(bookingId)
  if (!booking) return reject('unknown-booking', pointId, 'No booking found for this code.', 404)
  if (booking.pointId !== pointId) return reject('wrong-point', pointId, 'This booking is for a different drop point.', 404)
  if (booking.status === 'received') return reject('replay', pointId, 'This handover was already confirmed. A code works only once.', 409)
  if (booking.status === 'cancelled') return reject('cancelled', pointId, 'This booking was cancelled.', 409)
  if (Date.now() > Date.parse(booking.expiresAt)) return reject('expired', pointId, 'This handover code has expired. Ask the customer to book again.', 410)
  if (booking.mode === 'pickup' && booking.status !== 'collected') {
    return reject('not-collected', pointId, 'This pickup hasn’t been collected from the customer yet.', 409)
  }
  if (booking.mode === 'dropoff' && booking.status !== 'booked') return reject('bad-state', pointId, `This booking is ${booking.status}.`, 409)
  return { booking }
}

async function heldDevices(pointId: string) {
  return queryAll<Device & Record<string, unknown>>({
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :pk',
    ExpressionAttributeValues: { ':pk': `HELD#${pointId}` },
  })
}

partner.get('/point', async (c) => {
  const point = await getItem<Point & Record<string, unknown>>('POINT', c.get('user').pointId!)
  if (!point) return c.json({ error: 'Your drop point is not set up yet.' }, 404)
  return c.json(strip(point))
})

partner.get('/bookings', async (c) => {
  const items = await queryAll<Booking & Record<string, unknown>>({
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :pk',
    ExpressionAttributeValues: { ':pk': `POINT#${c.get('user').pointId}` },
  })
  return c.json(
    items.map((b) => {
      const { userId, code, pickup, ...rest } = strip(b)
      return rest
    }),
  )
})

partner.get('/handover', async (c) => {
  const found = await resolveHandover({ code: c.req.query('code'), qr: c.req.query('qr') }, c.get('user').pointId!)
  if ('error' in found) return c.json({ error: found.error }, found.status)
  const { userId, code, pickup, ...booking } = strip(found.booking)
  return c.json({ ...booking, devices: found.booking.devices.map((d) => ({ ...d, suggestedKg: typicalKg(d.kind) })) })
})

partner.post('/handover', idempotent, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ code?: string; qr?: string; items?: { deviceId: string; kg: number; unit?: string }[] }>()
  const found = await resolveHandover(body, user.pointId!)
  if ('error' in found) return c.json({ error: found.error }, found.status)
  const booking = found.booking
  const weights = new Map((body.items ?? []).map((i) => [i.deviceId, i]))
  if (weights.size !== booking.devices.length || booking.devices.some((d) => !weights.has(d.id))) {
    return c.json({ error: 'Weigh every booked item, and only those.' }, 400)
  }
  for (const device of booking.devices) {
    const entry = weights.get(device.id)!
    if ((entry.unit ?? 'kg') !== 'kg') return c.json({ error: 'Weights must be in kg.' }, 400)
    if (!Number.isFinite(Number(entry.kg)) || Number(entry.kg) <= 0 || Number(entry.kg) > 60) {
      return c.json({ error: `Enter a weight between 0 and 60 kg for ${device.label}.` }, 400)
    }
  }
  const devices = await Promise.all(booking.devices.map((d) => loadDevice(booking.userId, d.id)))
  if (devices.some((d) => !d)) return c.json({ error: 'A booked device is missing.' }, 409)
  const point = await getItem<Point>('POINT', booking.pointId)
  const demo = booking.demo || Boolean(point?.demo)
  const now = new Date().toISOString()
  const certificateId = newId('cert')
  const items: TransactItem[] = []
  const certItems: CertificateItem[] = []
  for (const device of devices as Device[]) {
    const kg = Number(Number(weights.get(device.id)!.kg).toFixed(3))
    const { items: moves, event } = moveDevice(
      device,
      'received',
      { type: 'handover.received', actorRole: 'partner', actorRef: actorRef(user.id), bookingId: booking.id, weightKg: kg, unit: 'kg', details: { pointId: booking.pointId } },
      { set: { weightKg: kg, receivedAt: now, certificateId, impactSeq: device.trailSeq + 1, gsi2pk: `HELD#${booking.pointId}`, gsi2sk: now } },
    )
    items.push(...moves, impactEntry(device, event, kg))
    certItems.push({
      deviceId: device.id,
      eventId: event.eventId,
      label: device.label,
      kind: device.kind,
      kg,
      unit: 'kg',
      ...itemImpact(device.kind, kg),
      wipe: device.wipe ? { guideId: device.wipe.guideId, guideVersion: device.wipe.guideVersion, attestedAt: device.wipe.attestedAt, summary: device.wipe.summary } : null,
    })
  }
  const certificate: Certificate = {
    id: certificateId,
    bookingId: booking.id,
    userId: booking.userId,
    holderName: booking.userName,
    pointId: booking.pointId,
    pointName: booking.pointName,
    pointAddress: point?.address ?? '',
    demo,
    collectorName: booking.collectorName,
    items: certItems,
    totals: { devices: certItems.length, ...sumImpact(certItems) },
    version: impactVersion,
    issuedAt: now,
  }
  items.push(
    {
      Update: {
        TableName,
        Key: { pk: `BOOKING#${booking.id}`, sk: 'META' },
        UpdateExpression: 'SET #st = :received, receivedAt = :now, certificateId = :cid',
        ConditionExpression: '#st = :expected',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':received': 'received', ':expected': booking.status, ':now': now, ':cid': certificateId },
      },
    },
    {
      Put: {
        TableName,
        Item: { pk: `CERT#${certificateId}`, sk: 'META', gsi1pk: `USER#${booking.userId}`, gsi1sk: `CERT#${now}`, ...certificate },
        ConditionExpression: 'attribute_not_exists(pk)',
      },
    },
    { Delete: { TableName, Key: { pk: codeKey(booking.code), sk: 'META' } } },
  )
  const stats = statsUpdate(
    { devicesCollected: certItems.length, kgWeighed: certificate.totals.kg, co2eKgEstimated: certificate.totals.co2eKg, energyKwhEstimated: certificate.totals.energyKwh },
    demo,
  )
  if (stats) items.push(stats)
  try {
    await db.send(new TransactWriteCommand({ TransactItems: items }))
  } catch (err) {
    if (cancellationReasons(err).includes('ConditionalCheckFailed')) {
      log('handover_rejected', { reason: 'race', pointId: booking.pointId })
      return c.json({ error: 'This handover was just confirmed by someone else. A code works only once.' }, 409)
    }
    throw err
  }
  log('handover_confirmed', { pointId: booking.pointId, devices: certItems.length, demo })
  const { userId, ...publicCert } = certificate
  return c.json(publicCert, 201)
})

partner.get('/held', async (c) => {
  const held = await heldDevices(c.get('user').pointId!)
  return c.json(
    held
      .filter((d) => d.status === 'received')
      .map((d) => ({ id: d.id, label: d.label, kind: d.kind, weightKg: d.weightKg, receivedAt: d.receivedAt, bookingId: d.bookingId, certificateId: d.certificateId })),
  )
})

partner.post('/corrections', idempotent, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ deviceId?: string; kg?: number; reason?: string }>()
  const kg = Number(body.kg)
  const reason = (body.reason ?? '').trim().slice(0, 200)
  if (!Number.isFinite(kg) || kg <= 0 || kg > 60) return c.json({ error: 'Enter a weight between 0 and 60 kg.' }, 400)
  if (reason.length < 4) return c.json({ error: 'Say why the weight is being corrected.' }, 400)
  const device = (await heldDevices(user.pointId!)).find((d) => d.id === body.deviceId)
  if (!device || device.status !== 'received' || !device.weightKg || !device.receivedAt || !device.certificateId || !device.impactSeq) {
    return c.json({ error: 'Only items received here and not yet dispatched can be corrected.' }, 404)
  }
  if (Date.now() - Date.parse(device.receivedAt) > correctionWindowMs) return c.json({ error: 'Weights can be corrected for 48 hours after handover.' }, 409)
  const cert = await getItem<Certificate & Record<string, unknown>>(`CERT#${device.certificateId}`, 'META')
  if (!cert) return c.json({ error: 'Certificate not found.' }, 404)
  const before = itemImpact(device.kind, device.weightKg)
  const after = itemImpact(device.kind, kg)
  const { items, event } = moveDevice(
    device,
    'received',
    {
      type: 'weight.corrected',
      actorRole: 'partner',
      actorRef: actorRef(user.id),
      bookingId: device.bookingId,
      weightKg: kg,
      unit: 'kg',
      details: { fromKg: device.weightKg, toKg: kg, reason },
    },
    { set: { weightKg: kg, impactSeq: device.trailSeq + 1 } },
  )
  const certItems = cert.items.map((i) => (i.deviceId === device.id ? { ...i, kg, ...after, corrected: true } : i))
  items.push(
    impactEntry(device, event, kg, 'corrected'),
    {
      Update: {
        TableName,
        Key: { pk: `IMPACT#${device.id}`, sk: `EV#${String(device.impactSeq).padStart(5, '0')}` },
        UpdateExpression: 'SET #st = :superseded, supersededBy = :eid',
        ConditionExpression: 'attribute_exists(pk) AND #st <> :superseded',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':superseded': 'superseded', ':eid': event.eventId },
      },
    },
    {
      Update: {
        TableName,
        Key: { pk: `CERT#${cert.id}`, sk: 'META' },
        UpdateExpression: 'SET #items = :items, totals = :totals, updatedAt = :now',
        ExpressionAttributeNames: { '#items': 'items' },
        ExpressionAttributeValues: { ':items': certItems, ':totals': { devices: certItems.length, ...sumImpact(certItems) }, ':now': event.at },
      },
    },
  )
  const stats = statsUpdate(
    { kgWeighed: kg - device.weightKg, co2eKgEstimated: after.co2eKg - before.co2eKg, energyKwhEstimated: after.energyKwh - before.energyKwh },
    device.demo,
  )
  if (stats) items.push(stats)
  await db.send(new TransactWriteCommand({ TransactItems: items }))
  return c.json({ ok: true, deviceId: device.id, kg })
})

partner.get('/dispatches', async (c) => {
  const items = await queryAll<Dispatch & Record<string, unknown>>({
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: { ':pk': `DISPATCHES#${c.get('user').pointId}` },
    ScanIndexForward: false,
  })
  return c.json(items.map((d) => ({ ...strip(d), items: d.items.map(({ userId, ...rest }) => rest) })))
})

partner.post('/dispatches', idempotent, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ deviceIds?: string[]; facility?: { type?: string; id?: string }; reference?: string }>()
  const reference = (body.reference ?? '').trim().slice(0, 80)
  if (reference.length < 3) return c.json({ error: 'Enter the dispatch or manifest reference.' }, 400)
  let facility: Dispatch['facility'] | null = null
  if (body.facility?.type === 'onboarded') {
    const found = await getItem<Facility>('FACILITY', body.facility.id ?? '')
    if (found) facility = { type: 'onboarded', id: found.id, name: found.name }
  } else if (body.facility?.type === 'cpcb') {
    const site = sites.find((s) => s.id === body.facility!.id && s.type === 'recycler')
    if (site) facility = { type: 'cpcb', id: site.id, name: site.name }
  }
  if (!facility) return c.json({ error: 'Pick a CPCB-registered recycler or an onboarded processing facility.' }, 400)
  const ids = [...new Set(body.deviceIds ?? [])]
  if (!ids.length || ids.length > 20) return c.json({ error: 'Pick between 1 and 20 items.' }, 400)
  const held = new Map((await heldDevices(user.pointId!)).map((d) => [d.id, d]))
  const devices = ids.map((id) => held.get(id))
  if (devices.some((d) => !d || d.status !== 'received')) return c.json({ error: 'Only items received here and not yet dispatched can be sent.' }, 409)
  const point = await getItem<Point>('POINT', user.pointId!)
  const now = new Date().toISOString()
  const dispatch: Dispatch = {
    id: newId('dsp'),
    pointId: user.pointId!,
    pointName: point?.name ?? '',
    facility,
    reference,
    items: devices.map((d) => ({ deviceId: d!.id, bookingId: d!.bookingId!, userId: d!.userId, label: d!.label, kind: d!.kind, kg: d!.weightKg ?? 0 })),
    totalKg: Number(devices.reduce((t, d) => t + (d!.weightKg ?? 0), 0).toFixed(3)),
    status: 'dispatched',
    demo: devices.some((d) => d!.demo) || Boolean(point?.demo),
    createdAt: now,
  }
  const items: TransactItem[] = [
    {
      Put: {
        TableName,
        Item: {
          pk: `DISPATCH#${dispatch.id}`,
          sk: 'META',
          gsi1pk: `DISPATCHES#${dispatch.pointId}`,
          gsi1sk: now,
          gsi2pk: `FACILITY#${facility.type}:${facility.id}`,
          gsi2sk: now,
          ...dispatch,
        },
      },
    },
    ...devices.flatMap(
      (d) =>
        moveDevice(
          d!,
          'dispatched',
          {
            type: 'dispatch.sent',
            actorRole: 'partner',
            actorRef: actorRef(user.id),
            bookingId: d!.bookingId,
            evidence: reference,
            details: { dispatchId: dispatch.id, facility: facility!.name, facilityType: facility!.type },
          },
          { set: { dispatchId: dispatch.id }, remove: ['gsi2pk', 'gsi2sk'] },
        ).items,
    ),
  ]
  const stats = statsUpdate({ devicesDispatched: devices.length, kgDispatched: dispatch.totalKg }, dispatch.demo)
  if (stats) items.push(stats)
  await db.send(new TransactWriteCommand({ TransactItems: items }))
  return c.json({ ...dispatch, items: dispatch.items.map(({ userId, ...rest }) => rest) }, 201)
})
