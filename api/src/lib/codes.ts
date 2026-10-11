import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function handoverCode(length = 6) {
  let code = ''
  for (let i = 0; i < length; i++) code += alphabet[randomInt(alphabet.length)]
  return code
}

export function newId(prefix: string) {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 12)}`
}

export function isHandoverCode(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(`^[${alphabet}]{6}$`).test(value)
}

// Lookup rows are keyed by a hash of the code, so the table never indexes the plain code.
export function codeKey(code: string) {
  return `CODE#${createHash('sha256').update(code).digest('hex')}`
}

function signature(bookingId: string, secret: string) {
  return createHmac('sha256', secret).update(`handover:${bookingId}`).digest('base64url').slice(0, 24)
}

export function qrPayload(bookingId: string, secret: string) {
  return `${bookingId}.${signature(bookingId, secret)}`
}

export function readQrPayload(payload: string, secret: string) {
  const [bookingId, sig] = payload.split('.')
  if (!bookingId || !sig || !/^bk-[0-9a-f]{12}$/.test(bookingId)) return null
  const expected = Buffer.from(signature(bookingId, secret))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given) ? bookingId : null
}
