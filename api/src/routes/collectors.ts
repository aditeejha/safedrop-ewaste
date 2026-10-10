import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Hono } from 'hono'
import type { AppEnv } from '../auth.js'
import { db, getItem, putItem, queryAll, strip, TableName } from '../db.js'
import type { Booking, Collector } from '../types.js'
import { istToday, loadBooking } from './bookings.js'

// Kabadiwalas and other informal collectors join as pickup partners: they collect wiped devices
// from homes and hand them over at a SafeDrop drop point, which issues the certificate.
export const collectors = new Hono<AppEnv>()

export async function loadCollector(id: string) {
  return getItem<Collector & Record<string, unknown>>('COLLECTOR', id)
}

function publicPickup(b: Booking) {
  return {
    id: b.id,
    date: b.date,
    status: b.status,
    pointName: b.pointName,
    pincode: b.pickup?.pincode,
    area: b.pickup?.address.split(',').slice(-2).join(',').trim(),
    devices: b.devices.map((d) => ({ id: d.id, kind: d.kind, label: d.label })),
  }
}

collectors.get('/', async (c) => {
  const profile = await loadCollector(c.get('user').id)
  if (!profile) return c.json({ error: 'Not registered as a pickup partner.' }, 404)
  return c.json(strip(profile))
})

collectors.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ name?: string; phone?: string; area?: string; pincodes?: string[] | string }>()
  const name = (body.name ?? '').trim().slice(0, 60)
  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10)
  const area = (body.area ?? '').trim().slice(0, 80)
  const raw = Array.isArray(body.pincodes) ? body.pincodes : String(body.pincodes ?? '').split(/[\s,]+/)
  const pincodes = [...new Set(raw.map((p) => p.trim()).filter((p) => /^[1-9]\d{5}$/.test(p)))].slice(0, 10)
  if (name.length < 2) return c.json({ error: 'Enter your name.' }, 400)
  if (!/^[6-9]\d{9}$/.test(phone)) return c.json({ error: 'Enter a 10-digit mobile number.' }, 400)
  if (!pincodes.length) return c.json({ error: 'Add at least one 6-digit pincode you collect from.' }, 400)
  const existing = await loadCollector(user.id)
  const profile: Collector = {
    id: user.id,
    name,
    phone,
    area,
    pincodes: existing?.status === 'approved' ? existing.pincodes : pincodes,
    status: existing?.status ?? 'pending',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
  await putItem({ pk: 'COLLECTOR', sk: user.id, ...profile, requestedPincodes: pincodes })
  return c.json(profile, existing ? 200 : 201)
})

async function approvedCollector(userId: string) {
  const profile = await loadCollector(userId)
  return profile?.status === 'approved' ? profile : null
}

collectors.get('/requests', async (c) => {
  const profile = await approvedCollector(c.get('user').id)
  if (!profile) return c.json({ error: 'Your pickup partner profile is waiting for approval.' }, 403)
  const today = istToday()
  const lists = await Promise.all(
    profile.pincodes.map((pin) =>
      queryAll<Booking & Record<string, unknown>>({
        IndexName: 'gsi2',
        KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk >= :today',
        ExpressionAttributeValues: { ':pk': `PICKUP#${pin}`, ':today': today },
      }),
    ),
  )
  const open = lists.flat().filter((b) => b.status === 'booked')
  open.sort((a, b) => a.date.localeCompare(b.date))
  return c.json(open.map(publicPickup))
})

collectors.get('/pickups', async (c) => {
  const user = c.get('user')
  const items = await queryAll<Booking & Record<string, unknown>>({
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :pk',
    ExpressionAttributeValues: { ':pk': `COLLECTOR#${user.id}` },
  })
  items.sort((a, b) => a.date.localeCompare(b.date))
  return c.json(
    items.map((b) => ({
      ...publicPickup(b),
      userName: b.userName,
      address: b.pickup?.address,
      phone: b.pickup?.phone,
      collectedAt: b.collectedAt,
    })),
  )
})

collectors.post('/pickups/:id/accept', async (c) => {
  const profile = await approvedCollector(c.get('user').id)
  if (!profile) return c.json({ error: 'Your pickup partner profile is waiting for approval.' }, 403)
  const booking = await loadBooking(c.req.param('id'))
  if (!booking || booking.mode !== 'pickup' || !booking.pickup || !profile.pincodes.includes(booking.pickup.pincode)) {
    return c.json({ error: 'Pickup not found in your area.' }, 404)
  }
  try {
    await db.send(
      new UpdateCommand({
        TableName,
        Key: { pk: `BOOKING#${booking.id}`, sk: 'META' },
        UpdateExpression:
          'SET #st = :accepted, collectorId = :cid, collectorName = :cname, collectorPhone = :cphone, acceptedAt = :now, gsi2pk = :mine',
        ConditionExpression: '#st = :booked',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':accepted': 'accepted',
          ':booked': 'booked',
          ':cid': profile.id,
          ':cname': profile.name,
          ':cphone': profile.phone,
          ':now': new Date().toISOString(),
          ':mine': `COLLECTOR#${profile.id}`,
        },
      }),
    )
  } catch (err) {
    if ((err as Error).name === 'ConditionalCheckFailedException') return c.json({ error: 'Another partner already accepted this pickup.' }, 409)
    throw err
  }
  return c.json({ ok: true })
})

collectors.post('/pickups/:id/collect', async (c) => {
  const user = c.get('user')
  const { code } = await c.req.json<{ code?: string }>()
  const booking = await loadBooking(c.req.param('id'))
  if (!booking || booking.collectorId !== user.id) return c.json({ error: 'Pickup not found.' }, 404)
  if (booking.status !== 'accepted') return c.json({ error: `This pickup is already ${booking.status}.` }, 409)
  if ((code ?? '').trim().toUpperCase() !== booking.code) {
    return c.json({ error: 'That code doesn’t match. Ask the customer to show the code on their booking page.' }, 400)
  }
  await db.send(
    new UpdateCommand({
      TableName,
      Key: { pk: `BOOKING#${booking.id}`, sk: 'META' },
      UpdateExpression: 'SET #st = :collected, collectedAt = :now',
      ConditionExpression: '#st = :accepted',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':collected': 'collected', ':accepted': 'accepted', ':now': new Date().toISOString() },
    }),
  )
  return c.json({ ok: true })
})

export const coverage = new Hono()

coverage.get('/:pincode', async (c) => {
  const pincode = c.req.param('pincode')
  if (!/^[1-9]\d{5}$/.test(pincode)) return c.json({ error: 'Use a 6-digit pincode.' }, 400)
  const items = await queryAll<{ sk: string }>({
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': `COVER#${pincode}` },
  })
  return c.json({ pincode, partners: items.length })
})
