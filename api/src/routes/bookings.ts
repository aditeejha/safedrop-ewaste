import { TransactWriteCommand, type TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb'
import { Hono } from 'hono'
import { isDemo, type AppEnv } from '../auth.js'
import { db, getItem, queryAll, strip, TableName } from '../db.js'
import { handoverCode, newId } from '../lib/codes.js'
import { bumpStats } from '../lib/quota.js'
import type { Booking, Pickup, Point } from '../types.js'
import { loadDevice } from './devices.js'

export const bookings = new Hono<AppEnv>()

type TransactItems = NonNullable<TransactWriteCommandInput['TransactItems']>

export function istToday() {
  return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function loadBooking(id: string) {
  return getItem<Booking & Record<string, unknown>>(`BOOKING#${id}`, 'META')
}

bookings.get('/', async (c) => {
  const items = await queryAll<Booking & Record<string, unknown>>({
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${c.get('user').id}`, ':sk': 'BOOKING#' },
    ScanIndexForward: false,
  })
  return c.json(items.map(strip))
})

function readPickup(raw: Partial<Pickup> | undefined): Pickup | string {
  const address = (raw?.address ?? '').trim()
  const pincode = (raw?.pincode ?? '').trim()
  const phone = (raw?.phone ?? '').replace(/\D/g, '').slice(-10)
  if (address.length < 8 || address.length > 200) return 'Enter the pickup address (8 to 200 characters).'
  if (!/^[1-9]\d{5}$/.test(pincode)) return 'Enter a valid 6-digit pincode.'
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a 10-digit mobile number for the pickup partner to call.'
  return { address, pincode, phone }
}

bookings.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ pointId?: string; date?: string; deviceIds?: string[]; mode?: string; pickup?: Partial<Pickup> }>()
  const mode = body.mode === 'pickup' ? 'pickup' : 'dropoff'
  const pickup = mode === 'pickup' ? readPickup(body.pickup) : undefined
  if (typeof pickup === 'string') return c.json({ error: pickup }, 400)
  const point = body.pointId ? await getItem<Point>('POINT', body.pointId) : undefined
  if (!point) return c.json({ error: 'Pick a drop-off point.' }, 400)
  const today = istToday()
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || body.date < today || body.date > addDays(today, 14)) {
    return c.json({ error: 'Pick a date within the next 14 days.' }, 400)
  }
  const ids = [...new Set(body.deviceIds ?? [])]
  if (!ids.length || ids.length > 20) return c.json({ error: 'Pick between 1 and 20 devices.' }, 400)
  const devices = await Promise.all(ids.map((id) => loadDevice(user.id, id)))
  if (devices.some((d) => !d)) return c.json({ error: 'One of these devices was not found.' }, 404)
  const notReady = devices.filter((d) => d!.status !== 'ready')
  if (notReady.length) {
    return c.json({ error: `Wipe ${notReady.map((d) => d!.label).join(', ')} before booking.` }, 409)
  }

  const now = new Date().toISOString()
  for (let attempt = 0; attempt < 3; attempt++) {
    const booking: Booking = {
      id: newId('bk'),
      code: handoverCode(),
      mode,
      pickup,
      userId: user.id,
      userName: user.name,
      pointId: point.id,
      pointName: point.name,
      date: body.date,
      devices: devices.map((d) => ({
        id: d!.id,
        kind: d!.kind,
        brand: d!.brand,
        model: d!.model,
        label: d!.label,
        wipedAt: d!.wipedAt,
        holdsData: d!.holdsData,
      })),
      status: 'booked',
      createdAt: now,
    }
    const items: TransactItems = [
      {
        Put: {
          TableName,
          Item: { pk: `CODE#${booking.code}`, sk: 'META', bookingId: booking.id },
          ConditionExpression: 'attribute_not_exists(pk)',
        },
      },
      {
        Put: {
          TableName,
          Item: {
            pk: `BOOKING#${booking.id}`,
            sk: 'META',
            gsi1pk: `USER#${user.id}`,
            gsi1sk: `BOOKING#${now}`,
            gsi2pk: pickup ? `PICKUP#${pickup.pincode}` : `POINT#${point.id}`,
            gsi2sk: `${booking.date}#${booking.id}`,
            ...booking,
          },
        },
      },
      ...ids.map((id) => ({
        Update: {
          TableName,
          Key: { pk: `USER#${user.id}`, sk: `DEVICE#${id}` },
          UpdateExpression: 'SET #st = :booked, bookingId = :bid',
          ConditionExpression: '#st = :ready',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: { ':booked': 'booked', ':ready': 'ready', ':bid': booking.id },
        },
      })),
    ]
    try {
      await db.send(new TransactWriteCommand({ TransactItems: items }))
      await bumpStats({ bookings: 1 }, isDemo(user))
      return c.json(booking, 201)
    } catch (err) {
      const reasons = (err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? []
      if (reasons[0]?.Code === 'ConditionalCheckFailed') continue
      if (reasons.some((r) => r.Code === 'ConditionalCheckFailed')) {
        return c.json({ error: 'A device changed while booking. Refresh and try again.' }, 409)
      }
      throw err
    }
  }
  return c.json({ error: 'Could not create a handover code. Please try again.' }, 503)
})

bookings.get('/:id', async (c) => {
  const booking = await loadBooking(c.req.param('id'))
  if (!booking || booking.userId !== c.get('user').id) return c.json({ error: 'Booking not found.' }, 404)
  return c.json(strip(booking))
})

bookings.post('/:id/cancel', async (c) => {
  const user = c.get('user')
  const booking = await loadBooking(c.req.param('id'))
  if (!booking || booking.userId !== user.id) return c.json({ error: 'Booking not found.' }, 404)
  if (booking.status !== 'booked' && booking.status !== 'accepted') {
    return c.json({ error: 'Only bookings that haven’t been collected can be cancelled.' }, 409)
  }
  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName,
            Key: { pk: `BOOKING#${booking.id}`, sk: 'META' },
            UpdateExpression: 'SET #st = :cancelled',
            ConditionExpression: '#st IN (:booked, :accepted)',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: { ':cancelled': 'cancelled', ':booked': 'booked', ':accepted': 'accepted' },
          },
        },
        { Delete: { TableName, Key: { pk: `CODE#${booking.code}`, sk: 'META' } } },
        ...booking.devices.map((d) => ({
          Update: {
            TableName,
            Key: { pk: `USER#${user.id}`, sk: `DEVICE#${d.id}` },
            UpdateExpression: 'SET #st = :ready REMOVE bookingId',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: { ':ready': 'ready' },
          },
        })),
      ],
    }),
  )
  await bumpStats({ bookings: -1 }, isDemo(user))
  return c.json({ ...strip(booking), status: 'cancelled' })
})
