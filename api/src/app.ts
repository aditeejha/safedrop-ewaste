import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireGroup, requirePartner, requireUser, type AppEnv } from './auth.js'
import { queryAll, strip } from './db.js'
import { log } from './lib/log.js'
import { admin } from './routes/admin.js'
import { helper, photos } from './routes/ai.js'
import { bookings } from './routes/bookings.js'
import { collectors, coverage } from './routes/collectors.js'
import { devices } from './routes/devices.js'
import { partner } from './routes/partner.js'
import { processor } from './routes/processor.js'
import { publicRoutes } from './routes/public.js'
import type { Certificate } from './types.js'

export const app = new Hono<AppEnv>().basePath('/api')

// API Gateway adds the CORS headers; preflights only need a 2xx before any auth runs.
app.options('*', (c) => c.body(null, 204))

app.use('*', async (c, next) => {
  const started = Date.now()
  await next()
  log('request', { method: c.req.method, route: c.req.routePath, status: c.res.status, ms: Date.now() - started })
})

app.route('/', publicRoutes)
app.route('/ask', helper)
app.route('/coverage', coverage)

app.use('/me/*', requireUser)
app.get('/me', (c) => c.json(c.get('user')))
app.route('/me/devices', devices)
app.route('/me/bookings', bookings)
app.route('/me/photos', photos)
app.route('/me/collector', collectors)
app.get('/me/certificates', async (c) => {
  const items = await queryAll<Certificate & Record<string, unknown>>({
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${c.get('user').id}`, ':sk': 'CERT#' },
    ScanIndexForward: false,
  })
  return c.json(items.map(strip))
})

app.use('/partner/*', requireUser, requirePartner)
app.route('/partner', partner)

app.use('/processor/*', requireUser, requireGroup('processor', 'This page is for recycling facility staff.'))
app.route('/processor', processor)

app.use('/admin/*', requireUser, requireGroup('admin', 'This page is for SafeDrop admins.'))
app.route('/admin', admin)

app.notFound((c) => c.json({ error: 'Not found.' }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
  if (err instanceof SyntaxError) return c.json({ error: 'Invalid request body.' }, 400)
  log('api_error', { name: err.name, message: err.message.slice(0, 200), route: c.req.routePath })
  return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500)
})
