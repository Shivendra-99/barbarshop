import { Notification } from '../models/Notification.js'

/** Inserts a batch of notifications (the fan-out for one event). */
export async function notify(entries) {
  if (!entries.length) return []
  return Notification.insertMany(entries)
}

/** The audiences a given user is allowed to read. */
export function audiencesForUser(user) {
  if (user.role === 'founder') return ['founder']
  if (user.role === 'owner') return [`owner:${user._id.toString()}`]
  return [`user:${user._id.toString()}`]
}
