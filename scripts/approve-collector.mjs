// Approves a pickup partner after a phone verification call: node scripts/approve-collector.mjs <email>
import { AdminGetUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { readFileSync } from 'node:fs'

const region = 'ap-south-1'
const outputs = JSON.parse(readFileSync('infra/outputs.json', 'utf8')).SafeDropEwaste
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }))
const cognito = new CognitoIdentityProviderClient({ region })

export async function approveCollector(userId) {
  const { Item } = await db.send(new GetCommand({ TableName: outputs.TableName, Key: { pk: 'COLLECTOR', sk: userId } }))
  if (!Item) throw new Error('No pickup partner application for this user')
  const pincodes = Item.requestedPincodes ?? Item.pincodes
  await db.send(
    new UpdateCommand({
      TableName: outputs.TableName,
      Key: { pk: 'COLLECTOR', sk: userId },
      UpdateExpression: 'SET #st = :approved, pincodes = :pins, approvedAt = :now',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':approved': 'approved', ':pins': pincodes, ':now': new Date().toISOString() },
    }),
  )
  for (const pincode of pincodes) {
    await db.send(new PutCommand({ TableName: outputs.TableName, Item: { pk: `COVER#${pincode}`, sk: userId, name: Item.name } }))
  }
  return { name: Item.name, pincodes }
}

if (process.argv[1]?.endsWith('approve-collector.mjs')) {
  const email = process.argv[2]
  if (!email) throw new Error('Usage: node scripts/approve-collector.mjs <email>')
  const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: outputs.UserPoolId, Username: email }))
  const sub = user.UserAttributes.find((a) => a.Name === 'sub').Value
  console.log('approved', await approveCollector(sub))
}
