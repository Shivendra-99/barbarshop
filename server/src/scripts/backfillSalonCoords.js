/**
 * One-off: give existing salons map coordinates so "Near you" and distances
 * work. Only fills salons that have none; never touches an owner's exact pin.
 *
 *   node src/scripts/backfillSalonCoords.js          # dry run — prints, writes nothing
 *   node src/scripts/backfillSalonCoords.js --apply  # writes lat/lng
 */
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { Salon } from '../models/Salon.js'
import { geocodeFirst, salonQueries } from '../lib/geo/geocode.js'

const apply = process.argv.includes('--apply')
await mongoose.connect(env.mongoUri)

const salons = await Salon.find({ 'location.lat': null, 'location.source': { $ne: 'pin' } })
console.log(`${salons.length} salon(s) without coordinates${apply ? '' : ' (dry run)'}\n`)

let filled = 0
for (const s of salons) {
  const c = await geocodeFirst(salonQueries(s), { eLoc: s.location?.eLoc })
  console.log(
    c ? '📍' : '❌',
    s.name.padEnd(26),
    c ? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)} (${c.source})` : 'not found — owner can pin it',
  )
  if (c && apply) {
    s.location = { eLoc: s.location?.eLoc ?? null, lat: c.lat, lng: c.lng, source: c.source }
    await s.save()
    filled += 1
  }
}

console.log(apply ? `\nWrote coordinates for ${filled} salon(s).` : '\nDry run — re-run with --apply to save.')
await mongoose.disconnect()
