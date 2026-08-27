/**
 * Role resolution for a fresh login. The founder is a single configured phone
 * (FOUNDER_PHONE); owners are created in the database by the founder, so an
 * existing owner keeps their stored role on login. The OWNERS list below only
 * seeds the demo salons — it does not grant roles to real sign-ins.
 */

import { env } from './env.js'

export const FOUNDER = { name: 'Founder', phone: env.founderPhone, role: 'founder' }

export const OWNERS = [
  { code: 'own-1', name: 'Rakesh Verma', phone: '9811100001', role: 'owner' },
  { code: 'own-2', name: 'Sneha Kapoor', phone: '9811100002', role: 'owner' },
  { code: 'own-3', name: 'Imran Sheikh', phone: '9811100003', role: 'owner' },
  { code: 'own-4', name: 'Divya Raghav', phone: '9811100004', role: 'owner' },
]

const BY_PHONE = new Map([
  [FOUNDER.phone, { role: 'founder', name: FOUNDER.name }],
  ...OWNERS.map((o) => [o.phone, { role: 'owner', name: o.name, code: o.code }]),
])

/** Returns { role, name?, code? } for a phone; defaults to customer. */
export function identityForPhone(phone) {
  return BY_PHONE.get(phone) ?? { role: 'customer' }
}

export const ROLES = ['customer', 'owner', 'founder']
