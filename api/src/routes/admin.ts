import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Hono } from 'hono'
import type { AppEnv } from '../auth.js'
import { db, queryAll, strip, TableName } from '../db.js'
import { log } from '../lib/log.js'
import type { Collector } from '../types.js'
import { loadCollector } from './collectors.js'

export const admin = new Hono<AppEnv>()

admin.get('/collectors', async (c) => {
  const items = await queryAll<Collector & Record<string, unknown>>({
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'COLLECTOR' },
  })
  items.sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || b.createdAt.localeCompare(a.createdAt))
  return c.json(items.map(strip))
})

export async function approveCollector(id: string) {
  const profile = await loadCollector(id)
  if (!profile) return null
  const pincodes = profile.requestedPincodes?.length ? profile.requestedPincodes : profile.pincodes
  await db.send(
    new UpdateCommand({
      TableName,
      Key: { pk: 'COLLECTOR', sk: id },
      UpdateExpression: 'SET #st = :approved, pincodes = :pins, approvedAt = :now',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':approved': 'approved', ':pins': pincodes, ':now': new Date().toISOString() },
    }),
  )
  for (const pincode of pincodes) {
    await db.send(new PutCommand({ TableName, Item: { pk: `COVER#${pincode}`, sk: id } }))
  }
  return { ...profile, status: 'approved', pincodes }
}

admin.post('/collectors/:id/approve', async (c) => {
  const approved = await approveCollector(c.req.param('id'))
  if (!approved) return c.json({ error: 'Application not found.' }, 404)
  log('collector_approved', { pincodes: approved.pincodes.length })
  return c.json(approved)
})

admin.post('/collectors/:id/reject', async (c) => {
  const profile = await loadCollector(c.req.param('id'))
  if (!profile) return c.json({ error: 'Application not found.' }, 404)
  await db.send(
    new UpdateCommand({
      TableName,
      Key: { pk: 'COLLECTOR', sk: profile.id },
      UpdateExpression: 'SET #st = :rejected',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':rejected': 'rejected' },
    }),
  )
  return c.json({ ...profile, status: 'rejected' })
})
