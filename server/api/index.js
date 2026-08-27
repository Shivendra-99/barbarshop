import { createApp } from '../src/app.js'
import { connectDB } from '../src/config/db.js'

/**
 * Vercel serverless entry. Unlike the local server (src/index.js, which calls
 * app.listen), Vercel invokes this handler per request. We connect to MongoDB
 * once — cached across warm invocations — then hand the request to the Express
 * app. The original URL is preserved, so all /api/* routes work as normal.
 */
const app = createApp()
let dbReady = null

export default async function handler(req, res) {
  try {
    if (!dbReady) dbReady = connectDB()
    await dbReady
  } catch (err) {
    dbReady = null // let the next invocation retry the connection
    // eslint-disable-next-line no-console
    console.error('[api] database connection failed:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Service temporarily unavailable.' }))
    return
  }
  return app(req, res)
}
