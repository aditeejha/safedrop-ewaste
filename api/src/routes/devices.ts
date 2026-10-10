import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Hono } from 'hono'
import { isDemo, type AppEnv } from '../auth.js'
import { db, deleteItem, getItem, putItem, queryAll, strip, TableName } from '../db.js'
import { newId } from '../lib/codes.js'
import { criticalStepIds, findGuide, stepIds } from '../lib/guides.js'
import { guideFor, holdsData, isDeviceKind } from '../lib/kinds.js'
import { bumpStats } from '../lib/quota.js'
import type { Device } from '../types.js'

export const devices = new Hono<AppEnv>()

const key = (userId: string, id: string) => ({ pk: `USER#${userId}`, sk: `DEVICE#${id}` })

export async function loadDevice(userId: string, id: string) {
  return getItem<Device & Record<string, unknown>>(key(userId, id).pk, key(userId, id).sk)
}

function text(value: unknown, max = 80) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
}

devices.get('/', async (c) => {
  const items = await queryAll<Device & Record<string, unknown>>({
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${c.get('user').id}`, ':sk': 'DEVICE#' },
  })
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return c.json(items.map(strip))
})

devices.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<Record<string, unknown>>()
  if (!isDeviceKind(body.kind)) return c.json({ error: 'Pick what kind of device this is.' }, 400)
  const brand = text(body.brand, 40)
  const model = text(body.model, 60)
  const requestedGuide = text(body.guideId, 40)
  const guideId = requestedGuide && findGuide(requestedGuide) ? requestedGuide : guideFor(body.kind, brand, text(body.os, 20))
  const dataBearing = holdsData(body.kind)
  const device: Device = {
    id: newId('dev'),
    userId: user.id,
    kind: body.kind,
    brand,
    model,
    label: text(body.label) ?? ([brand, model].filter(Boolean).join(' ') || body.kind.replace('-', ' ')),
    guideId: dataBearing ? guideId : null,
    holdsData: dataBearing,
    steps: {},
    status: dataBearing ? 'added' : 'ready',
    identification: typeof body.identification === 'object' && body.identification ? (body.identification as Device['identification']) : undefined,
    createdAt: new Date().toISOString(),
  }
  await putItem({ ...key(user.id, device.id), ...device })
  await bumpStats({ devicesAdded: 1 }, isDemo(user))
  return c.json(device, 201)
})

devices.get('/:id', async (c) => {
  const device = await loadDevice(c.get('user').id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  return c.json(strip(device))
})

devices.put('/:id/steps/:stepId', async (c) => {
  const user = c.get('user')
  const device = await loadDevice(user.id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  const guide = findGuide(device.guideId)
  const stepId = c.req.param('stepId')
  if (!guide || !stepIds(guide).includes(stepId)) return c.json({ error: 'Unknown step.' }, 400)
  if (device.status !== 'added') return c.json({ error: 'This device is already marked as wiped.' }, 409)
  const { done } = await c.req.json<{ done: boolean }>()
  const res = await db.send(
    new UpdateCommand({
      TableName,
      Key: key(user.id, device.id),
      UpdateExpression: done ? 'SET steps.#s = :now' : 'REMOVE steps.#s',
      ExpressionAttributeNames: { '#s': stepId },
      ExpressionAttributeValues: done ? { ':now': new Date().toISOString() } : undefined,
      ReturnValues: 'ALL_NEW',
    }),
  )
  return c.json(strip(res.Attributes as Record<string, unknown>))
})

devices.post('/:id/wiped', async (c) => {
  const user = c.get('user')
  const device = await loadDevice(user.id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  if (device.status !== 'added') return c.json(strip(device))
  const guide = findGuide(device.guideId)
  const missing = guide ? criticalStepIds(guide).filter((id) => !device.steps[id]) : []
  if (missing.length) {
    return c.json({ error: `Finish the ${missing.length} critical step${missing.length > 1 ? 's' : ''} first.`, missing }, 409)
  }
  const res = await db.send(
    new UpdateCommand({
      TableName,
      Key: key(user.id, device.id),
      UpdateExpression: 'SET #st = :ready, wipedAt = :now',
      ConditionExpression: '#st = :added',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':ready': 'ready', ':added': 'added', ':now': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }),
  )
  await bumpStats({ devicesWiped: 1 }, isDemo(user))
  return c.json(strip(res.Attributes as Record<string, unknown>))
})

devices.delete('/:id', async (c) => {
  const user = c.get('user')
  const device = await loadDevice(user.id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  if (device.status === 'booked' || device.status === 'recycled') {
    return c.json({ error: 'Booked or recycled devices stay on record.' }, 409)
  }
  await deleteItem(key(user.id, device.id).pk, key(user.id, device.id).sk)
  return c.json({ ok: true })
})
