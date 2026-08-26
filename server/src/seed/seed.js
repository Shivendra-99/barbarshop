import { fileURLToPath } from 'url'
import { User } from '../models/User.js'
import { Service } from '../models/Service.js'
import { Salon } from '../models/Salon.js'
import { FOUNDER, OWNERS } from '../config/roles.js'
import { SERVICES, SALONS } from './data.js'

/**
 * Idempotent seed: upserts staff users, the service menu and the salon list.
 * Safe to run repeatedly — it matches on natural keys (phone, code, name+city)
 * so it won't create duplicates. Assumes an active mongoose connection.
 */
export async function runSeed() {
  // --- Staff users (founder + owners) ---
  const staff = [
    { ...FOUNDER, code: null },
    ...OWNERS.map((o) => ({ name: o.name, phone: o.phone, role: 'owner', code: o.code })),
  ]
  for (const s of staff) {
    await User.findOneAndUpdate(
      { phone: s.phone },
      { $setOnInsert: { name: s.name, role: s.role, code: s.code } },
      { upsert: true },
    )
  }

  // Drop the legacy unique `code` index (per-salon services reuse codes), then
  // remove any global services from the old model.
  try {
    await Service.collection.dropIndex('code_1')
  } catch {
    /* index already gone */
  }
  await Service.deleteMany({ salon: { $exists: false } })

  // --- Salons (resolve ownerCode → user _id) ---
  const owners = await User.find({ code: { $ne: null } })
  const ownerByCode = new Map(owners.map((o) => [o.code, o._id]))

  for (const s of SALONS) {
    const ownerId = ownerByCode.get(s.ownerCode)
    if (!ownerId) continue
    const { ownerCode, ...rest } = s
    const salon = await Salon.findOneAndUpdate(
      { name: s.name, city: s.city },
      { $setOnInsert: { ...rest, owner: ownerId } },
      { upsert: true, new: true },
    )

    // Seed this salon's starter menu from its category template (idempotent
    // on salon + service name).
    for (const svc of SERVICES[s.category] ?? []) {
      await Service.findOneAndUpdate(
        { salon: salon._id, name: svc.name },
        { $setOnInsert: { ...svc, salon: salon._id, owner: ownerId, category: s.category } },
        { upsert: true },
      )
    }
  }

  const counts = {
    users: await User.countDocuments(),
    services: await Service.countDocuments(),
    salons: await Salon.countDocuments(),
  }
  return counts
}

/* Run directly (`npm run seed`) — connect, seed, disconnect. */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const { connectDB, disconnectDB } = await import('../config/db.js')
  const { mode } = await connectDB()
  // eslint-disable-next-line no-console
  console.log(`[seed] connected (${mode})`)
  const counts = await runSeed()
  // eslint-disable-next-line no-console
  console.log('[seed] done:', counts)
  await disconnectDB()
  process.exit(0)
}
