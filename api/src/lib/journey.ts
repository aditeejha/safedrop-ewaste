import type { TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb'
import { TableName } from '../db.js'
import type { Device } from '../types.js'
import { assertDeviceMove, type DeviceState } from './lifecycle.js'
import { nextEvent, type TrailEvent } from './trail.js'

export type TransactItem = NonNullable<TransactWriteCommandInput['TransactItems']>[number]

export const deviceKey = (userId: string, id: string) => ({ pk: `USER#${userId}`, sk: `DEVICE#${id}` })
export const trailKey = (deviceId: string, seq: number) => ({ pk: `TRAIL#${deviceId}`, sk: `EV#${String(seq).padStart(5, '0')}` })

type EventFields = Pick<TrailEvent, 'type' | 'actorRole' | 'actorRef'> &
  Partial<Pick<TrailEvent, 'bookingId' | 'weightKg' | 'unit' | 'evidence' | 'details'>>

// Moves a device to a new state and appends the matching trail event in the same transaction.
// The condition on status and trailSeq makes concurrent or replayed moves fail instead of forking the chain.
export function moveDevice(
  device: Device,
  to: DeviceState,
  fields: EventFields,
  extra: { set?: Record<string, unknown>; remove?: string[] } = {},
) {
  assertDeviceMove(device.status, to)
  const event = nextEvent(device, { ...fields, deviceId: device.id, from: device.status, to, demo: device.demo })
  const sets: Record<string, unknown> = { status: to, trailSeq: event.seq, trailHash: event.hash, updatedAt: event.at, ...(extra.set ?? {}) }
  const names: Record<string, string> = {}
  const values: Record<string, unknown> = { ':from': device.status, ':prevSeq': device.trailSeq }
  const assignments = Object.entries(sets).map(([field, value], i) => {
    names[`#f${i}`] = field
    values[`:v${i}`] = value
    return `#f${i} = :v${i}`
  })
  const removals = (extra.remove ?? []).map((field, i) => {
    names[`#r${i}`] = field
    return `#r${i}`
  })
  names['#status'] = 'status'
  const items: TransactItem[] = [
    {
      Update: {
        TableName,
        Key: deviceKey(device.userId, device.id),
        UpdateExpression: `SET ${assignments.join(', ')}${removals.length ? ` REMOVE ${removals.join(', ')}` : ''}`,
        ConditionExpression: '#status = :from AND trailSeq = :prevSeq',
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      },
    },
    { Put: { TableName, Item: { ...trailKey(device.id, event.seq), ...event }, ConditionExpression: 'attribute_not_exists(pk)' } },
  ]
  return { items, event }
}

export function statsUpdate(changes: Record<string, number>, demo: boolean): TransactItem | null {
  const entries = Object.entries(changes).filter(([, v]) => v !== 0)
  if (!entries.length) return null
  return {
    Update: {
      TableName,
      Key: { pk: 'STATS', sk: demo ? 'DEMO' : 'TOTAL' },
      UpdateExpression: `ADD ${entries.map(([key], i) => `#k${i} :v${i}`).join(', ')}`,
      ExpressionAttributeNames: Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k])),
      ExpressionAttributeValues: Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v])),
    },
  }
}

export function cancellationReasons(err: unknown) {
  return ((err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? []).map((r) => r.Code ?? 'None')
}
