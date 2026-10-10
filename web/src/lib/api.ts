import { idToken } from './auth'
import { config } from './config'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}) {
  const headers = new Headers(init.headers)
  const token = await idToken().catch(() => null)
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (init.json !== undefined) headers.set('content-type', 'application/json')
  const res = await fetch(`${config().apiBase}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ApiError(String(body.error ?? `Request failed (${res.status})`), res.status, body)
  return body as T
}

export function errorText(err: unknown) {
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}
