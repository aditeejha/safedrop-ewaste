import { createHash, randomUUID } from 'node:crypto'
import type { DeviceState } from './lifecycle.js'

// Each device has an append-only event trail. Every event stores the hash of the previous one,
// so editing or deleting a past event breaks the chain. This is tamper-evident logging,
// not proof of what physically happened to the item.
export type TrailEvent = {
  eventId: string
  deviceId: string
  seq: number
  type: string
  at: string
  actorRole: string
  actorRef: string
  from?: DeviceState
  to?: DeviceState
  bookingId?: string
  weightKg?: number
  unit?: 'kg'
  evidence?: string
  details?: Record<string, string | number | boolean>
  demo: boolean
  prevHash: string
  hash: string
}

export type TrailHead = { trailSeq: number; trailHash: string }

export function genesisHash(deviceId: string) {
  return createHash('sha256').update(`safedrop:${deviceId}`).digest('hex')
}

export function actorRef(userId: string) {
  return createHash('sha256').update(`actor:${userId}`).digest('hex').slice(0, 12)
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function hashEvent(event: Omit<TrailEvent, 'hash'>) {
  return createHash('sha256').update(canonical(event)).digest('hex')
}

export function nextEvent(head: TrailHead, fields: Omit<TrailEvent, 'eventId' | 'seq' | 'prevHash' | 'hash' | 'at'> & { at?: string }) {
  const body: Omit<TrailEvent, 'hash'> = {
    ...fields,
    eventId: randomUUID(),
    seq: head.trailSeq + 1,
    at: fields.at ?? new Date().toISOString(),
    prevHash: head.trailHash,
  }
  return { ...body, hash: hashEvent(body) } as TrailEvent
}

export function verifyTrail(deviceId: string, events: TrailEvent[]) {
  let prev = genesisHash(deviceId)
  const sorted = [...events].sort((a, b) => a.seq - b.seq)
  for (const [i, event] of sorted.entries()) {
    const { hash, ...body } = event
    if (event.seq !== i + 1 || event.prevHash !== prev || hashEvent(body) !== hash) return { intact: false, brokenAt: i + 1 }
    prev = hash
  }
  return { intact: true, brokenAt: null }
}
