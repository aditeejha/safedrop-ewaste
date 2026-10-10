import { Hono } from 'hono'
import { getItem, queryAll, strip } from '../db.js'
import type { Certificate, Point } from '../types.js'

export const publicRoutes = new Hono()

export function shortName(name: string) {
  const words = name.replace(/\(.*?\)/g, ' ').trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w))
  if (!words.length) return 'A SafeDrop user'
  return words.length > 1 ? `${words[0]} ${words[words.length - 1][0]}.` : words[0]
}

publicRoutes.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }))

const emptyStats = { devicesAdded: 0, devicesWiped: 0, devicesRecycled: 0, kgRecycled: 0, co2eKgAvoided: 0, energyKwhSaved: 0, bookings: 0 }

async function readStats(sk: string) {
  const { pk, sk: key, ...counts } = (await getItem<Record<string, number>>('STATS', sk)) ?? {}
  return { ...emptyStats, ...counts }
}

publicRoutes.get('/stats', async (c) => {
  const [real, demo] = await Promise.all([readStats('TOTAL'), readStats('DEMO')])
  return c.json({ ...real, demo })
})

publicRoutes.get('/points', async (c) => {
  const points = await queryAll<Point & Record<string, unknown>>({
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'POINT' },
  })
  return c.json(points.map(strip))
})

publicRoutes.get('/certificates/:id', async (c) => {
  const cert = await getItem<Certificate & Record<string, unknown>>(`CERT#${c.req.param('id')}`, 'META')
  if (!cert) return c.json({ error: 'No certificate with this ID.' }, 404)
  const { userId, receivedBy, ...rest } = strip(cert)
  return c.json({ ...rest, holderName: shortName(cert.holderName), verified: true })
})
