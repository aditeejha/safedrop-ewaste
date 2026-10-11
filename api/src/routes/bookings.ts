import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import { Hono } from 'hono'
import type { AppEnv } from '../auth.js'
import { db, getItem, queryAll, strip, TableName } from '../db.js'
import { codeKey, handoverCode, newId, qrPayload } from '../lib/codes.js'
import { idempotent } from '../lib/idempotency.js'
import { cancellationReasons, moveDevice, statsUpdate, type TransactItem } from '../lib/journey.js'
import { assertBookingMove } from '../lib/lifecycle.js'
import { decideRoute } from '../lib/route.js'
import { qrSecret } from '../lib/secrets.js'
import { actorRef } from '../lib/trail.js'
import type { Booking, Pickup, Point } from '../types.js'
import { loadDevice } from './devices.js'

export const bookings = new Hono<AppEnv>()

const maxDevices = 20

export function istToday() {
  return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Handover codes stop working at the end of the second day after the booked date (IST).
export function expiryFor(date: string) {
  return new Date(`${addDays(date, 2)}T23:59:59+05:30`).toISOString()
}

export async function loadBooking(id: string) {
  return getItem<Booking & Record<string, unknown>>(`BOOKING#${id}`, 'META')
}

async function forOwner(booking: Booking & Record<string, unknown>) {
  return { ...strip(booking), qr: qrPayload(booking.id, await qrSecret()) }
}

function readPickup(raw: Partial<Pickup> | undefined): Pickup | string {
  const address = (raw?.address ?? '').trim()
  const pincode = (raw?.pincode ?? '').trim()
  const phone = (raw?.phone ?? '').replace(/\D/g, '').slice(-10)
  if (address.length < 8 || address.length > 200) return 'Enter the pickup address (8 to 200 characters).'
  if (!/^[1-9]\d{5}$/.test(pincode)) return 'Enter a valid 6-digit pincode.'
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a 10-digit mobile number for the pickup partner to call.'
  return { address, pincode, phone }
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

bookings.post('/', idempotent, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ pointId?: string; date?: string; deviceIds?: string[]; mode?: string; pickup?: Partial<Pickup> }>()
  const mode = body.mode === 'pickup' ? 'pickup' : 'dropoff'
  const pickup = mode === 'pickup' ? readPickup(body.pickup) : undefined
  if (typeof pickup === 'string') return c.json({ error: pickup }, 400)
  const point = body.pointId ? await getItem<Point>('POINT', body.pointId) : undefined
  if (!point) return c.json({ error: 'Pick a drop point.' }, 400)
  if (!point.accepts.services.includes(mode)) return c.json({ error: `${point.name} doesn’t take ${mode === 'pickup' ? 'pickup deliveries' : 'drop-offs'}.` }, 409)
  const today = istToday()
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || body.date < today || body.date > addDays(today, 14)) {
    return c.json({ error: 'Pick a date within the next 14 days.' }, 400)
  }
  const ids = [...new Set(body.deviceIds ?? [])]
  if (!ids.length || ids.length > maxDevices) return c.json({ error: `Pick between 1 and ${maxDevices} devices.` }, 400)
  const devices = await Promise.all(ids.map((id) => loadDevice(user.id, id)))
  if (devices.some((d) => !d)) return c.json({ error: 'One of these devices was not found.' }, 404)
  const notReady = devices.filter((d) => d!.status !== 'ready')
  if (notReady.length) return c.json({ error: `Finish the wipe for ${notReady.map((d) => d!.label).join(', ')} before booking.` }, 409)
  const notAccepted = devices.filter((d) => !point.accepts.kinds.includes(d!.kind))
  if (notAccepted.length) return c.json({ error: `${point.name} hasn’t confirmed it accepts ${notAccepted.map((d) => d!.label).join(', ')}.` }, 409)
  const hazards = devices.filter((d) => decideRoute(d!.condition, d!.holdsData).route === 'battery-hazard')
  if (hazards.length && !point.accepts.damagedBatteries) {
    return c.json(
      {
        error: `${hazards.map((d) => d!.label).join(', ')} has a swollen or damaged battery. ${point.name} doesn’t accept those, so follow the battery safety steps and call the site first.`,
      },
      409,
    )
  }

  const now = new Date().toISOString()
  const demo = user.groups.includes('demo') || point.demo
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
      expiresAt: expiryFor(body.date),
      devices: devices.map((d) => ({
        id: d!.id,
        kind: d!.kind,
        brand: d!.brand,
        model: d!.model,
        label: d!.label,
        holdsData: d!.holdsData,
        wipeAttestedAt: d!.wipe?.attestedAt,
        guideVersion: d!.wipe?.guideVersion,
      })),
      status: 'booked',
      demo,
      createdAt: now,
    }
    const items: TransactItem[] = [
      {
        Put: {
          TableName,
          Item: { pk: codeKey(booking.code), sk: 'META', bookingId: booking.id, expiresAt: booking.expiresAt },
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
      ...devices.flatMap(
        (d) =>
          moveDevice(
            d!,
            'booked',
            { type: 'handover.booked', actorRole: 'owner', actorRef: actorRef(user.id), bookingId: booking.id, details: { pointId: point.id, mode, date: booking.date } },
            { set: { bookingId: booking.id } },
          ).items,
      ),
    ]
    const stats = statsUpdate({ bookings: 1 }, demo)
    if (stats) items.push(stats)
    try {
      await db.send(new TransactWriteCommand({ TransactItems: items }))
      return c.json(await forOwner(booking as Booking & Record<string, unknown>), 201)
    } catch (err) {
      const reasons = cancellationReasons(err)
      if (reasons[0] === 'ConditionalCheckFailed') continue
      if (reasons.includes('ConditionalCheckFailed')) return c.json({ error: 'A device changed while booking. Refresh and try again.' }, 409)
      throw err
    }
  }
  return c.json({ error: 'Could not create a handover code. Please try again.' }, 503)
})

bookings.get('/:id', async (c) => {
  const booking = await loadBooking(c.req.param('id'))
  if (!booking || booking.userId !== c.get('user').id) return c.json({ error: 'Booking not found.' }, 404)
  return c.json(await forOwner(booking))
})

bookings.post('/:id/cancel', idempotent, async (c) => {
  const user = c.get('user')
  const booking = await loadBooking(c.req.param('id'))
  if (!booking || booking.userId !== user.id) return c.json({ error: 'Booking not found.' }, 404)
  assertBookingMove(booking.status, 'cancelled')
  const devices = await Promise.all(booking.devices.map((d) => loadDevice(user.id, d.id)))
  const items: TransactItem[] = [
    {
      Update: {
        TableName,
        Key: { pk: `BOOKING#${booking.id}`, sk: 'META' },
        UpdateExpression: 'SET #st = :cancelled',
        ConditionExpression: '#st = :current',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':cancelled': 'cancelled', ':current': booking.status },
      },
    },
    { Delete: { TableName, Key: { pk: codeKey(booking.code), sk: 'META' } } },
    ...devices
      .filter((d) => d && d.status === 'booked')
      .flatMap(
        (d) =>
          moveDevice(d!, 'ready', { type: 'handover.cancelled', actorRole: 'owner', actorRef: actorRef(user.id), bookingId: booking.id }, { remove: ['bookingId'] })
            .items,
      ),
  ]
  await db.send(new TransactWriteCommand({ TransactItems: items }))
  return c.json({ ...strip(booking), status: 'cancelled' })
})
