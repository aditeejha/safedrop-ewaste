import { randomInt, randomUUID } from 'node:crypto'

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
