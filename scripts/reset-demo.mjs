// Clears everything the judges' demo account created, so the next judge starts clean.
// node scripts/reset-demo.mjs [--all-stats] [--deep]   (--all-stats also clears the real totals; only for pre-launch test data)
import './aws-guard.mjs'
import { AdminGetUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const region = 'ap-south-1'
const outputs = JSON.parse(readFileSync('infra/outputs.json', 'utf8')).SafeDropEwaste
const TableName = outputs.TableName
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }))
const cognito = new CognitoIdentityProviderClient({ region })

const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: outputs.UserPoolId, Username: process.env.DEMO_EMAIL ?? 'demo@example.com' }))
const sub = user.UserAttributes.find((a) => a.Name === 'sub').Value

async function query(input) {
  const items = []
  let ExclusiveStartKey
  do {
    const res = await db.send(new QueryCommand({ TableName, ...input, ExclusiveStartKey }))
    items.push(...res.Items)
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items
}

const devices = await query({ KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `USER#${sub}` } })
const owned = await query({ IndexName: 'gsi1', KeyConditionExpression: 'gsi1pk = :pk', ExpressionAttributeValues: { ':pk': `USER#${sub}` } })
const pickups = await query({ IndexName: 'gsi2', KeyConditionExpression: 'gsi2pk = :pk', ExpressionAttributeValues: { ':pk': `COLLECTOR#${sub}` } })
const quota = await query({ KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `QUOTA#${sub}` } })
const idempotency = await query({ KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `IDEMP#${sub}` } })
const deviceIds = devices.filter((d) => d.sk.startsWith('DEVICE#')).map((d) => d.id)
const perDevice = (
  await Promise.all(
    deviceIds.flatMap((id) => [
      query({ KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `TRAIL#${id}` } }),
      query({ KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `IMPACT#${id}` } }),
    ]),
  )
).flat()
const dispatches = await query({ IndexName: 'gsi1', KeyConditionExpression: 'gsi1pk = :pk', ExpressionAttributeValues: { ':pk': 'DISPATCHES#demo-dtu' } })

const keys = new Map()
const add = (pk, sk) => keys.set(`${pk}|${sk}`, { pk, sk })
for (const item of [...devices, ...owned, ...pickups, ...quota, ...idempotency, ...perDevice, ...dispatches]) add(item.pk, item.sk)
for (const item of [...owned, ...pickups]) if (item.code) add(`CODE#${createHash('sha256').update(item.code).digest('hex')}`, 'META')
add('STATS', 'DEMO')
// --deep also sweeps demo-flagged rows left behind by devices that no longer exist.
if (process.argv.includes('--deep')) {
  let ExclusiveStartKey
  do {
    const res = await db.send(new ScanCommand({ TableName, ProjectionExpression: 'pk, sk, demo', ExclusiveStartKey }))
    for (const item of res.Items) if (item.demo === true && /^(TRAIL|IMPACT|DISPATCH|CERT|BOOKING)#/.test(item.pk)) add(item.pk, item.sk)
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
}
if (process.argv.includes('--all-stats')) add('STATS', 'TOTAL')

const all = [...keys.values()]
for (let i = 0; i < all.length; i += 25) {
  await db.send(new BatchWriteCommand({ RequestItems: { [TableName]: all.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })) } }))
}
console.log(
  `removed ${all.length} items (${deviceIds.length} devices with ${perDevice.length} trail/impact rows, ${owned.length} bookings/receipts, ${pickups.length} pickups, ${dispatches.length} dispatches)`,
)
