import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { createMiddleware } from 'hono/factory'
import { config } from './config.js'

export type User = {
  id: string
  email: string
  name: string
  groups: string[]
  pointId?: string
}

export type AppEnv = { Variables: { user: User } }

const verifier = CognitoJwtVerifier.create({
  userPoolId: config.userPoolId || 'ap-south-1_placeholder',
  clientId: config.userPoolClientId || 'placeholder',
  tokenUse: 'id',
})

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const token = (c.req.header('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return c.json({ error: 'Please sign in first.' }, 401)
  try {
    const claims = await verifier.verify(token)
    c.set('user', {
      id: claims.sub,
      email: String(claims.email ?? ''),
      name: String(claims.name ?? claims.email ?? 'SafeDrop user'),
      groups: (claims['cognito:groups'] as string[] | undefined) ?? [],
      pointId: claims['custom:pointId'] as string | undefined,
    })
  } catch {
    return c.json({ error: 'Your session expired. Please sign in again.' }, 401)
  }
  await next()
})

export function isDemo(user: User) {
  return user.groups.includes('demo')
}

export function requireGroup(group: string, message: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!c.get('user').groups.includes(group)) return c.json({ error: message }, 403)
    await next()
  })
}

export const requirePartner = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user')
  if (!user.groups.includes('partner') || !user.pointId) {
    return c.json({ error: 'This page is for recycler partners only.' }, 403)
  }
  await next()
})
