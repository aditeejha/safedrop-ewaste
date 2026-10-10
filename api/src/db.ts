import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb'
import { config } from './config.js'

export const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }), {
  marshallOptions: { removeUndefinedValues: true },
})

export const TableName = config.table

export async function getItem<T>(pk: string, sk: string) {
  const res = await db.send(new GetCommand({ TableName, Key: { pk, sk } }))
  return res.Item as T | undefined
}

export async function putItem(item: Record<string, unknown>) {
  await db.send(new PutCommand({ TableName, Item: item }))
}

export async function deleteItem(pk: string, sk: string) {
  await db.send(new DeleteCommand({ TableName, Key: { pk, sk } }))
}

export async function queryAll<T>(input: Omit<QueryCommandInput, 'TableName'>) {
  const items: T[] = []
  let ExclusiveStartKey: Record<string, unknown> | undefined
  do {
    const res = await db.send(new QueryCommand({ TableName, ...input, ExclusiveStartKey }))
    items.push(...((res.Items ?? []) as T[]))
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items
}

export function strip<T extends Record<string, unknown>>(item: T) {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item
  return rest
}
