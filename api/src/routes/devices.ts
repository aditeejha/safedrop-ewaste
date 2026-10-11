import { BatchWriteCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Hono } from 'hono'
import { isDemo, type AppEnv } from '../auth.js'
import { db, getItem, queryAll, strip, TableName } from '../db.js'
import { newId } from '../lib/codes.js'
import { findGuide, stepIds } from '../lib/guides.js'
import { idempotent } from '../lib/idempotency.js'
import { cancellationReasons, deviceKey, moveDevice, statsUpdate, trailKey, type TransactItem } from '../lib/journey.js'
import { defaultLabel, guideFor, holdsData, isDeviceKind } from '../lib/kinds.js'
import { decideRoute, readCondition } from '../lib/route.js'
import { actorRef, genesisHash, nextEvent } from '../lib/trail.js'
import type { Device, StepState, WipeSummary } from '../types.js'

export const devices = new Hono<AppEnv>()

export const attestationText =
  'I completed the critical steps on this device myself. I understand SafeDrop cannot check remotely that my data was erased.'
export const attestationVersion = 'attest-1'

export async function loadDevice(userId: string, id: string) {
  return getItem<Device & Record<string, unknown>>(deviceKey(userId, id).pk, deviceKey(userId, id).sk)
}

function text(value: unknown, max = 80) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
}

export function wipeSummary(device: Device): WipeSummary | undefined {
  const guide = findGuide(device.guideId)
  if (!guide || !device.wipe) return undefined
  const steps = guide.sections.flatMap((s) => s.steps)
  const states = steps.map((s) => device.wipe!.steps[s.id]?.state)
  return {
    total: steps.length,
    critical: steps.filter((s) => s.critical).length,
    done: states.filter((s) => s === 'done').length,
    na: states.filter((s) => s === 'na').length,
    skipped: states.filter((s) => s === 'skipped').length,
  }
}

function withRoute(device: Device & Record<string, unknown>) {
  return { ...strip(device), recommendation: decideRoute(device.condition, device.holdsData) }
}

devices.get('/', async (c) => {
  const items = await queryAll<Device & Record<string, unknown>>({
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${c.get('user').id}`, ':sk': 'DEVICE#' },
  })
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return c.json(items.map(withRoute))
})

devices.post('/', idempotent, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<Record<string, unknown>>()
  if (!isDeviceKind(body.kind)) return c.json({ error: 'Pick what kind of device this is.' }, 400)
  const brand = text(body.brand, 40)
  const model = text(body.model, 60)
  const requestedGuide = text(body.guideId, 40)
  const dataBearing = holdsData(body.kind)
  const guideId = dataBearing ? (requestedGuide && findGuide(requestedGuide) ? requestedGuide : guideFor(body.kind, brand, text(body.os, 20))) : null
  const guide = findGuide(guideId)
  const id = newId('dev')
  const now = new Date().toISOString()
  const status = dataBearing ? 'added' : 'ready'
  const demo = isDemo(user)
  const event = nextEvent(
    { trailSeq: 0, trailHash: genesisHash(id) },
    { type: 'device.added', deviceId: id, to: status, actorRole: 'owner', actorRef: actorRef(user.id), demo, details: { kind: body.kind, holdsData: dataBearing } },
  )
  const device: Device = {
    id,
    userId: user.id,
    kind: body.kind,
    brand,
    model,
    label: text(body.label) ?? defaultLabel(body.kind, brand, model),
    guideId,
    holdsData: dataBearing,
    status,
    demo,
    trailSeq: event.seq,
    trailHash: event.hash,
    wipe: guide ? { guideId: guide.id, guideVersion: guide.version ?? 'unversioned', steps: {} } : undefined,
    condition: readCondition(body.condition),
    identification: typeof body.identification === 'object' && body.identification ? (body.identification as Device['identification']) : undefined,
    createdAt: now,
  }
  const items: TransactItem[] = [
    { Put: { TableName, Item: { ...deviceKey(user.id, id), ...device }, ConditionExpression: 'attribute_not_exists(pk)' } },
    { Put: { TableName, Item: { ...trailKey(id, event.seq), ...event } } },
  ]
  const stats = statsUpdate({ devicesAdded: 1 }, demo)
  if (stats) items.push(stats)
  await db.send(new TransactWriteCommand({ TransactItems: items }))
  return c.json(withRoute(device as Device & Record<string, unknown>), 201)
})

devices.get('/:id', async (c) => {
  const device = await loadDevice(c.get('user').id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  return c.json(withRoute(device))
})

devices.get('/:id/trail', async (c) => {
  const device = await loadDevice(c.get('user').id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  const events = await queryAll<Record<string, unknown>>({ KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `TRAIL#${device.id}` } })
  return c.json(events.map(strip))
})

devices.put('/:id/condition', async (c) => {
  const user = c.get('user')
  const device = await loadDevice(user.id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  const condition = readCondition(await c.req.json())
  const res = await db.send(
    new UpdateCommand({
      TableName,
      Key: deviceKey(user.id, device.id),
      UpdateExpression: 'SET #c = :c',
      ExpressionAttributeNames: { '#c': 'condition' },
      ExpressionAttributeValues: { ':c': condition },
      ReturnValues: 'ALL_NEW',
    }),
  )
  return c.json(withRoute(res.Attributes as Device & Record<string, unknown>))
})

devices.put('/:id/steps/:stepId', async (c) => {
  const user = c.get('user')
  const device = await loadDevice(user.id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  const guide = findGuide(device.guideId)
  const stepId = c.req.param('stepId')
  if (!guide || !device.wipe || !stepIds(guide).includes(stepId)) return c.json({ error: 'Unknown step.' }, 400)
  if (device.status !== 'added' && device.status !== 'wiping') return c.json({ error: 'The wipe for this device is already attested.' }, 409)
  const { state } = await c.req.json<{ state: StepState | null }>()
  if (state !== null && !['done', 'na', 'skipped'].includes(state)) return c.json({ error: 'Use done, na or skipped.' }, 400)
  const step = guide.sections.flatMap((s) => s.steps).find((s) => s.id === stepId)!
  if (state === 'skipped' && step.critical) {
    return c.json({ error: 'Critical steps can’t be skipped. Mark it done, or “doesn’t apply” if your device doesn’t have this.' }, 400)
  }

  const now = new Date().toISOString()
  const stepValue = state ? { state, at: now } : null
  if (device.status === 'added') {
    const steps = { ...device.wipe.steps }
    if (stepValue) steps[stepId] = stepValue
    const { items } = moveDevice(
      device,
      'wiping',
      { type: 'wipe.started', actorRole: 'owner', actorRef: actorRef(user.id), details: { guideId: device.wipe.guideId, guideVersion: device.wipe.guideVersion } },
      { set: { wipe: { ...device.wipe, startedAt: now, steps } } },
    )
    await db.send(new TransactWriteCommand({ TransactItems: items }))
  } else {
    await db.send(
      new UpdateCommand({
        TableName,
        Key: deviceKey(user.id, device.id),
        UpdateExpression: stepValue ? 'SET wipe.steps.#s = :v' : 'REMOVE wipe.steps.#s',
        ConditionExpression: '#st = :wiping',
        ExpressionAttributeNames: { '#s': stepId, '#st': 'status' },
        ExpressionAttributeValues: stepValue ? { ':v': stepValue, ':wiping': 'wiping' } : { ':wiping': 'wiping' },
      }),
    )
  }
  return c.json(withRoute((await loadDevice(user.id, device.id))!))
})

devices.post('/:id/attest', idempotent, async (c) => {
  const user = c.get('user')
  const device = await loadDevice(user.id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  const body = await c.req.json<{ confirm?: boolean; statement?: string }>()
  if (body.confirm !== true || body.statement !== attestationVersion) return c.json({ error: 'Please confirm the statement first.' }, 400)
  if (device.status === 'ready') return c.json(withRoute(device))
  const guide = findGuide(device.guideId)
  if (!guide || !device.wipe || device.status !== 'wiping') return c.json({ error: 'Start the checklist first.' }, 409)
  const missing = guide.sections
    .flatMap((s) => s.steps)
    .filter((s) => s.critical && !['done', 'na'].includes(device.wipe!.steps[s.id]?.state ?? ''))
  if (missing.length) {
    return c.json({ error: `Finish the ${missing.length} critical step${missing.length > 1 ? 's' : ''} first.`, missing: missing.map((s) => s.id) }, 409)
  }
  const summary = wipeSummary(device)!
  const now = new Date().toISOString()
  const { items } = moveDevice(
    device,
    'ready',
    {
      type: 'wipe.attested',
      actorRole: 'owner',
      actorRef: actorRef(user.id),
      details: { guideId: guide.id, guideVersion: device.wipe.guideVersion, statement: attestationVersion, ...summary },
    },
    { set: { wipe: { ...device.wipe, attestedAt: now, attestation: attestationVersion, summary } } },
  )
  const stats = statsUpdate({ wipesAttested: 1 }, device.demo)
  if (stats) items.push(stats)
  try {
    await db.send(new TransactWriteCommand({ TransactItems: items }))
  } catch (err) {
    if (cancellationReasons(err).includes('ConditionalCheckFailed')) return c.json({ error: 'This device changed. Refresh and try again.' }, 409)
    throw err
  }
  return c.json(withRoute((await loadDevice(user.id, device.id))!))
})

devices.delete('/:id', async (c) => {
  const user = c.get('user')
  const device = await loadDevice(user.id, c.req.param('id'))
  if (!device) return c.json({ error: 'Device not found.' }, 404)
  if (!['added', 'wiping', 'ready'].includes(device.status)) {
    return c.json({ error: 'Devices that were booked or handed over stay on record.' }, 409)
  }
  const trail = await queryAll<{ pk: string; sk: string }>({ KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `TRAIL#${device.id}` } })
  const keys = [deviceKey(user.id, device.id), ...trail.map(({ pk, sk }) => ({ pk, sk }))]
  for (let i = 0; i < keys.length; i += 25) {
    await db.send(new BatchWriteCommand({ RequestItems: { [TableName]: keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })) } }))
  }
  return c.json({ ok: true })
})
