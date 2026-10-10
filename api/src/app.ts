import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requirePartner, requireUser, type AppEnv } from './auth.js'
import { helper, photos } from './routes/ai.js'
import { bookings } from './routes/bookings.js'
import { collectors, coverage } from './routes/collectors.js'
import { devices } from './routes/devices.js'
import { partner } from './routes/partner.js'
import { publicRoutes } from './routes/public.js'
import { queryAll, strip } from './db.js'
import type { Certificate } from './types.js'

export const app = new Hono<AppEnv>().basePath('/api')

// API Gateway adds the CORS headers; preflights only need a 2xx before any auth runs.
app.options('*', (c) => c.body(null, 204))

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

app.notFound((c) => c.json({ error: 'Not found.' }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
  if (err instanceof SyntaxError) return c.json({ error: 'Invalid request body.' }, 400)
  console.error(err)
  return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500)
})


