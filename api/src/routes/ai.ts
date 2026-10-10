import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import type { AppEnv } from '../auth.js'
import { config } from '../config.js'
import { askHelper } from '../lib/assistant.js'
import { takeAiQuota } from '../lib/quota.js'
import { identifyDevice } from '../lib/vision.js'

const s3 = new S3Client({ region: config.region })
const imageTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const maxPhotoBytes = 5 * 1024 * 1024

export const photos = new Hono<AppEnv>()

photos.post('/', async (c) => {
  const { contentType } = await c.req.json<{ contentType?: string }>()
  const ext = contentType ? imageTypes[contentType] : undefined
  if (!ext) return c.json({ error: 'Use a JPEG, PNG or WebP photo.' }, 400)
  const key = `photos/${c.get('user').id}/${randomUUID()}.${ext}`
  const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: config.photoBucket, Key: key, ContentType: contentType }), {
    expiresIn: 300,
  })
  return c.json({ key, url })
})

photos.post('/identify', async (c) => {
  const user = c.get('user')
  const { key } = await c.req.json<{ key?: string }>()
  if (!key || !key.startsWith(`photos/${user.id}/`)) return c.json({ error: 'Upload a photo first.' }, 400)
  if (!(await takeAiQuota(user.id))) return c.json({ error: `You've reached today's limit of ${config.aiDailyLimit} AI checks.` }, 429)
  const object = await s3.send(new GetObjectCommand({ Bucket: config.photoBucket, Key: key }))
  if ((object.ContentLength ?? 0) > maxPhotoBytes) return c.json({ error: 'Photo is larger than 5 MB.' }, 413)
  const bytes = await object.Body!.transformToByteArray()
  const result = await identifyDevice(bytes, object.ContentType ?? 'image/jpeg')
  return c.json(result)
})

export const helper = new Hono()

helper.post('/', async (c) => {
  const { question, guideId } = await c.req.json<{ question?: string; guideId?: string }>()
  const text = (question ?? '').trim()
  if (text.length < 3 || text.length > 500) return c.json({ error: 'Ask a question between 3 and 500 characters.' }, 400)
  const visitor = c.req.header('cloudfront-viewer-address')?.split(':')[0] ?? c.req.header('x-forwarded-for')?.split(',')[0] ?? 'local'
  if (!(await takeAiQuota(`ip-${visitor}`))) return c.json({ error: "You've reached today's question limit. Try again tomorrow." }, 429)
  return c.json(await askHelper(text, guideId))
})
