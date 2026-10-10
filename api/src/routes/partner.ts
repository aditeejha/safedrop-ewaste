import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import { Hono } from 'hono'
import type { AppEnv } from '../auth.js'
import { db, getItem, queryAll, strip, TableName } from '../db.js'
import { isHandoverCode, newId } from '../lib/codes.js'
import { itemImpact, sumImpact, typicalKg } from '../lib/impact.js'
import { bumpStats } from '../lib/quota.js'
import type { Booking, Certificate, CertificateItem, Point } from '../types.js'
import { loadBooking } from './bookings.js'

export const partner = new Hono<AppEnv>()

async function bookingForCode(code: string, pointId: string) {
  if (!isHandoverCode(code)) return { error: 'Codes are 6 letters and numbers.', status: 400 as const }
  const ref = await getItem<{ bookingId: string }>(`CODE#${code}`, 'META')
  const booking = ref ? await loadBooking(ref.bookingId) : undefined
  if (!booking || booking.pointId !== pointId) return { error: 'No booking with this code at your drop-off point.', status: 404 as const }
  const ready = booking.mode === 'pickup' ? booking.status === 'collected' : booking.status === 'booked'
  if (!ready) {
    const reason =
      booking.mode === 'pickup' && (booking.status === 'booked' || booking.status === 'accepted')
        ? 'This pickup hasn’t been collected from the customer yet.'
        : `This booking is already ${booking.status}.`
    return { error: reason, status: 409 as const }
  }
  return { booking }
}

partner.get('/point', async (c) => {
  const point = await getItem<Point & Record<string, unknown>>('POINT', c.get('user').pointId!)
  if (!point) return c.json({ error: 'Your drop-off point is not set up yet.' }, 404)
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
      const { userId, ...rest } = strip(b)
      return rest
    }),
  )
})

partner.get('/handover/:code', async (c) => {
  const found = await bookingForCode(c.req.param('code').toUpperCase(), c.get('user').pointId!)
  if ('error' in found) return c.json({ error: found.error }, found.status)
  const { userId, ...booking } = strip(found.booking)
  return c.json({
    ...booking,
    devices: found.booking.devices.map((d) => ({ ...d, suggestedKg: typicalKg(d.kind) })),
  })
})

partner.post('/handover/:code', async (c) => {
  const user = c.get('user')
  const found = await bookingForCode(c.req.param('code').toUpperCase(), user.pointId!)
  if ('error' in found) return c.json({ error: found.error }, found.status)
  const booking = found.booking
  const body = await c.req.json<{ items?: { deviceId: string; kg: number }[] }>()
  const weights = new Map((body.items ?? []).map((i) => [i.deviceId, Number(i.kg)]))
  for (const device of booking.devices) {
    const kg = weights.get(device.id)
    if (kg === undefined || !Number.isFinite(kg) || kg <= 0 || kg > 60) {
      return c.json({ error: `Enter a weight between 0 and 60 kg for ${device.label}.` }, 400)
    }
  }
  const point = await getItem<Point>('POINT', booking.pointId)
  const items: CertificateItem[] = booking.devices.map((d) => {
    const kg = Number(weights.get(d.id)!.toFixed(3))
    return { label: d.label, kind: d.kind, kg, wipedAt: d.wipedAt, ...itemImpact(d.kind, kg) }
  })
  const now = new Date().toISOString()
  const certificate: Certificate = {
    id: newId('cert'),
    bookingId: booking.id,
    userId: booking.userId,
    holderName: booking.userName,
    pointId: booking.pointId,
    pointName: booking.pointName,
    pointAddress: point?.address ?? '',
    demo: Boolean(point?.demo),
    collectorName: booking.collectorName,
    items,
    totals: { devices: items.length, ...sumImpact(items) },
    receivedBy: user.email,
    issuedAt: now,
  }
  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName,
            Key: { pk: `BOOKING#${booking.id}`, sk: 'META' },
            UpdateExpression: 'SET #st = :received, receivedAt = :now, certificateId = :cid',
            ConditionExpression: '#st = :expected',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: { ':received': 'received', ':expected': booking.status, ':now': now, ':cid': certificate.id },
          },
        },
        {
          Put: {
            TableName,
            Item: { pk: `CERT#${certificate.id}`, sk: 'META', gsi1pk: `USER#${booking.userId}`, gsi1sk: `CERT#${now}`, ...certificate },
          },
        },
        { Delete: { TableName, Key: { pk: `CODE#${booking.code}`, sk: 'META' } } },
        ...booking.devices.map((d) => ({
          Update: {
            TableName,
            Key: { pk: `USER#${booking.userId}`, sk: `DEVICE#${d.id}` },
            UpdateExpression: 'SET #st = :recycled, certificateId = :cid',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: { ':recycled': 'recycled', ':cid': certificate.id },
          },
        })),
      ],
    }),
  )
  await bumpStats(
    {
      devicesRecycled: items.length,
      kgRecycled: certificate.totals.kg,
      co2eKgAvoided: certificate.totals.co2eKg,
      energyKwhSaved: certificate.totals.energyKwh,
    },
    Boolean(point?.demo),
  )
  return c.json(certificate, 201)
})
