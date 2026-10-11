import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../auth.js'
import { db, TableName } from '../db.js'

// Replays the stored response when a client retries with the same Idempotency-Key,
// so a flaky mobile connection can't create a second device, booking or handover.
export const idempotent = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header('idempotency-key')
  if (!key) return next()
  if (!/^[A-Za-z0-9-]{8,64}$/.test(key)) return c.json({ error: 'Invalid Idempotency-Key header.' }, 400)
  const Key = { pk: `IDEMP#${c.get('user').id}`, sk: `${c.req.method} ${c.req.path}#${key}` }
  try {
    await db.send(
      new PutCommand({
        TableName,
        Item: { ...Key, state: 'pending', expiresAt: Math.floor(Date.now() / 1000) + 86400 },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    )
  } catch (err) {
    if ((err as Error).name !== 'ConditionalCheckFailedException') throw err
    const stored = (await db.send(new GetCommand({ TableName, Key }))).Item
    if (stored?.state === 'done') {
      return new Response(stored.body as string, {
        status: stored.status as number,
        headers: { 'content-type': 'application/json', 'idempotent-replay': 'true' },
      })
    }
    return c.json({ error: 'This request is already being processed.' }, 409)
  }
  await next()
  if (c.res.status >= 500) {
    await db.send(new DeleteCommand({ TableName, Key }))
    return
  }
  const body = await c.res.clone().text()
  await db.send(
    new UpdateCommand({
      TableName,
      Key,
      UpdateExpression: 'SET #st = :done, #status = :status, body = :body',
      ExpressionAttributeNames: { '#st': 'state', '#status': 'status' },
      ExpressionAttributeValues: { ':done': 'done', ':status': c.res.status, ':body': body.slice(0, 300_000) },
    }),
  )
})
