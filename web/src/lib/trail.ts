import type { TrailEvent } from './types'

// Recomputes a device's hash chain in the browser, independently of the server's own check.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .filter((k) => record[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(record[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyInBrowser(deviceId: string, events: TrailEvent[]) {
  let prev = await sha256(`safedrop:${deviceId}`)
  const sorted = [...events].sort((a, b) => a.seq - b.seq)
  for (const [i, event] of sorted.entries()) {
    const { hash, ...body } = event
    if (event.seq !== i + 1 || event.prevHash !== prev || (await sha256(canonical(body))) !== hash) return { intact: false, brokenAt: i + 1 }
    prev = hash
  }
  return { intact: true, brokenAt: null }
}
