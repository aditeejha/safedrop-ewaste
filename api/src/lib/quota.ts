import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { config } from '../config.js'
import { db, TableName } from '../db.js'

export async function takeAiQuota(userId: string) {
  const day = new Date().toISOString().slice(0, 10)
  try {
    await db.send(
      new UpdateCommand({
        TableName,
        Key: { pk: `QUOTA#${userId}`, sk: day },
        UpdateExpression: 'ADD used :one SET expiresAt = if_not_exists(expiresAt, :expires)',
        ConditionExpression: 'attribute_not_exists(used) OR used < :limit',
        ExpressionAttributeValues: { ':one': 1, ':limit': config.aiDailyLimit, ':expires': Math.floor(Date.now() / 1000) + 2 * 86400 },
      }),
    )
    return true
  } catch (err) {
    if ((err as Error).name === 'ConditionalCheckFailedException') return false
    throw err
  }
}

// Activity from the judges' demo account is kept apart so public impact only counts real handovers.
export async function bumpStats(changes: Record<string, number>, demo = false) {
  const entries = Object.entries(changes).filter(([, v]) => v !== 0)
  if (!entries.length) return
  await db.send(
    new UpdateCommand({
      TableName,
      Key: { pk: 'STATS', sk: demo ? 'DEMO' : 'TOTAL' },
      UpdateExpression: `ADD ${entries.map(([key], i) => `#k${i} :v${i}`).join(', ')}`,
      ExpressionAttributeNames: Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k])),
      ExpressionAttributeValues: Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v])),
    }),
  )
}
