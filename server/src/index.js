import { env, assertProdConfig } from './config/env.js'
import { connectDB, disconnectDB, isEphemeral } from './config/db.js'
import { createApp } from './app.js'
import { runSeed } from './seed/seed.js'

async function main() {
  assertProdConfig()

  const { mode } = await connectDB()
  // eslint-disable-next-line no-console
  console.log(`[db] connected (${mode})`)

  // An in-memory database starts empty, so seed it automatically for dev.
  if (isEphemeral()) {
    await runSeed()
    console.log('[db] in-memory database seeded')
  }

  const app = createApp()
  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on http://localhost:${env.port}`)
  })

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received, shutting down`)
    server.close()
    await disconnectDB()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[api] failed to start:', err)
  process.exit(1)
})
