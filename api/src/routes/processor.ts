import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import { Hono } from 'hono'
import type { AppEnv } from '../auth.js'
import { db, getItem, queryAll, strip, TableName } from '../db.js'
import { idempotent } from '../lib/idempotency.js'
import { moveDevice, statsUpdate, type TransactItem } from '../lib/journey.js'
import { actorRef } from '../lib/trail.js'
import type { Device, Dispatch, Facility } from '../types.js'
import { loadDevice } from './devices.js'

// Staff at an onboarded recycling facility confirm that a dispatched batch arrived for processing.
// Only this step can move a device to "processed", and it needs an evidence reference.
export const processor = new Hono<AppEnv>()

async function facilityFor(userId: string) {
  const link = await getItem<{ facilityId: string }>(`PROCESSOR#${userId}`, 'META')
  return link ? getItem<Facility & Record<string, unknown>>('FACILITY', link.facilityId) : undefined
}

processor.get('/facility', async (c) => {
  const facility = await facilityFor(c.get('user').id)
  if (!facility) return c.json({ error: 'Your account is not linked to a processing facility.' }, 404)
  return c.json(strip(facility))
})

processor.get('/dispatches', async (c) => {
  const facility = await facilityFor(c.get('user').id)
  if (!facility) return c.json({ error: 'Your account is not linked to a processing facility.' }, 404)
  const items = await queryAll<Dispatch & Record<string, unknown>>({
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :pk',
    ExpressionAttributeValues: { ':pk': `FACILITY#onboarded:${facility.id}` },
    ScanIndexForward: false,
  })
  return c.json(items.map((d) => ({ ...strip(d), items: d.items.map(({ userId, ...rest }) => rest) })))
})

processor.post('/dispatches/:id/confirm', idempotent, async (c) => {
  const user = c.get('user')
  const facility = await facilityFor(user.id)
  if (!facility) return c.json({ error: 'Your account is not linked to a processing facility.' }, 403)
  const dispatch = await getItem<Dispatch & Record<string, unknown>>(`DISPATCH#${c.req.param('id')}`, 'META')
  if (!dispatch || dispatch.facility.type !== 'onboarded' || dispatch.facility.id !== facility.id) return c.json({ error: 'Dispatch not found.' }, 404)
  if (dispatch.status === 'processed') return c.json({ error: 'This batch is already confirmed.' }, 409)
  const { evidence } = await c.req.json<{ evidence?: string }>()
  const reference = (evidence ?? '').trim().slice(0, 120)
  if (reference.length < 4) return c.json({ error: 'Enter your receipt or processing reference as evidence.' }, 400)
  const devices = await Promise.all(dispatch.items.map((i) => loadDevice(i.userId, i.deviceId)))
  if (devices.some((d) => !d || d.status !== 'dispatched')) return c.json({ error: 'Some items in this batch are not awaiting confirmation.' }, 409)
  const now = new Date().toISOString()
  const items: TransactItem[] = [
    {
      Update: {
        TableName,
        Key: { pk: `DISPATCH#${dispatch.id}`, sk: 'META' },
        UpdateExpression: 'SET #st = :processed, processedAt = :now, evidence = :evidence',
        ConditionExpression: '#st = :dispatched',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':processed': 'processed', ':dispatched': 'dispatched', ':now': now, ':evidence': reference },
      },
    },
  ]
  for (const device of devices as Device[]) {
    items.push(
      ...moveDevice(device, 'processed', {
        type: 'processing.confirmed',
        actorRole: 'processor',
        actorRef: actorRef(user.id),
        bookingId: device.bookingId,
        evidence: reference,
        details: { dispatchId: dispatch.id, facility: facility.name },
      }).items,
      {
        Update: {
          TableName,
          Key: { pk: `IMPACT#${device.id}`, sk: `EV#${String(device.impactSeq).padStart(5, '0')}` },
          UpdateExpression: 'SET processedAt = :now, processedEvidence = :evidence',
          ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(processedAt)',
          ExpressionAttributeValues: { ':now': now, ':evidence': reference },
        },
      },
    )
  }
  const stats = statsUpdate({ devicesProcessed: devices.length, kgProcessed: dispatch.totalKg }, dispatch.demo)
  if (stats) items.push(stats)
  await db.send(new TransactWriteCommand({ TransactItems: items }))
  return c.json({ ok: true, dispatchId: dispatch.id, devices: devices.length })
})
