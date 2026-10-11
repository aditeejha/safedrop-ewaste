import { Hono } from 'hono'
import { getItem, queryAll, strip } from '../db.js'
import { verifyTrail, type TrailEvent } from '../lib/trail.js'
import type { Certificate, Facility, Point } from '../types.js'

export const publicRoutes = new Hono()

export function shortName(name: string) {
  const words = name
    .replace(/\(.*?\)/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
  if (!words.length) return 'A SafeDrop user'
  return words.length > 1 ? `${words[0]} ${words[words.length - 1][0]}.` : words[0]
}

const emptyStats = {
  devicesAdded: 0,
  wipesAttested: 0,
  bookings: 0,
  devicesCollected: 0,
  kgWeighed: 0,
  co2eKgEstimated: 0,
  energyKwhEstimated: 0,
  devicesDispatched: 0,
  kgDispatched: 0,
  devicesProcessed: 0,
  kgProcessed: 0,
}

async function readStats(sk: string) {
  const { pk, sk: key, ...counts } = (await getItem<Record<string, number>>('STATS', sk)) ?? {}
  return { ...emptyStats, ...counts }
}

publicRoutes.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }))

publicRoutes.get('/stats', async (c) => {
  const [real, demo] = await Promise.all([readStats('TOTAL'), readStats('DEMO')])
  return c.json({ ...real, demo })
})

publicRoutes.get('/points', async (c) => {
  const points = await queryAll<Point & Record<string, unknown>>({ KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': 'POINT' } })
  return c.json(points.map(strip))
})

publicRoutes.get('/facilities', async (c) => {
  const items = await queryAll<Facility & Record<string, unknown>>({ KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': 'FACILITY' } })
  return c.json(items.map(strip))
})

// Full events are returned so anyone can recompute the hash chain; the server checks it too.
publicRoutes.get('/certificates/:id', async (c) => {
  const cert = await getItem<Certificate & Record<string, unknown>>(`CERT#${c.req.param('id')}`, 'META')
  if (!cert) return c.json({ error: 'No certificate with this ID.' }, 404)
  const trails = await Promise.all(
    cert.items.map(async (item) => {
      const events = await queryAll<TrailEvent & Record<string, unknown>>({
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `TRAIL#${item.deviceId}` },
      })
      const clean = events.map((e) => {
        const { pk, sk, ...rest } = e
        return rest as TrailEvent
      })
      const check = verifyTrail(item.deviceId, clean)
      const last = clean.sort((a, b) => a.seq - b.seq).at(-1)
      return { deviceId: item.deviceId, intact: check.intact, brokenAt: check.brokenAt, stage: last?.to ?? null, events: clean }
    }),
  )
  const { userId, ...rest } = strip(cert)
  return c.json({ ...rest, holderName: shortName(cert.holderName), trails })
})
