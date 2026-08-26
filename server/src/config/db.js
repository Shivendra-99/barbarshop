import mongoose from 'mongoose'
import { env } from './env.js'

let memoryServer = null

/**
 * Connects to MongoDB.
 *
 * With MONGODB_URI set (your Atlas cluster) it connects there. Without one, it
 * boots an in-memory MongoDB so the API runs end-to-end locally before Atlas is
 * configured — data is wiped on restart, which is exactly what you want for a
 * throwaway dev database.
 */
export async function connectDB() {
  mongoose.set('strictQuery', true)

  let uri = env.mongoUri
  let mode = 'atlas'

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    uri = memoryServer.getUri('salonsathi')
    mode = 'in-memory'
  }

  await mongoose.connect(uri)
  return { mode, uri }
}

export async function disconnectDB() {
  await mongoose.disconnect()
  if (memoryServer) await memoryServer.stop()
}

/** True when running against the throwaway in-memory database. */
export const isEphemeral = () => memoryServer != null
