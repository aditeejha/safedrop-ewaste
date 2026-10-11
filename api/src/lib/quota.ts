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
