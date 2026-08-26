# SalonSathi API

Node + Express + Mongoose backend for SalonSathi: OTP login with JWT sessions,
salons (list / submit / approve), services, bookings with server-authoritative
pricing, cancellation with wallet/UPI refunds, a wallet ledger, and a
three-audience notification fan-out.

The React frontend is wired to this API (see the repo root README). The server
is also standalone and testable on its own with curl.

## Run it

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Without a `MONGODB_URI` it boots an **in-memory MongoDB** and seeds it
automatically, so it works immediately with zero setup. Data resets on restart.

### Using MongoDB Atlas

Put your connection string in `.env`:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/salonsathi?retryWrites=true&w=majority
```

Then seed it once:

```bash
npm run seed
```

`npm run dev` now uses your cluster and the data persists.

## Health

```bash
curl http://localhost:4000/api/health
```

## Auth

The **phone number decides the role** (no user database in the demo): founder
`9000000000`, owners `9811100001`–`9811100004`, anyone else is a customer.

In dev the OTP is returned in the response (`devCode`) and logged — there is no
SMS carrier until one is wired into `src/lib/sms/`. Set `OTP_DEV_RETURN=false`
and implement `sendOtpSms` to go live.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/request-otp` | `{ phone }` | Returns `{ devCode }` in dev |
| POST | `/api/auth/verify-otp` | `{ phone, code, name? }` | Returns `{ token, user }` |
| GET | `/api/auth/me` | — | Bearer token → current user |

Send the token as `Authorization: Bearer <token>` on protected routes. Tokens
last 30 days (`JWT_EXPIRES_IN`).

## Endpoints

**Salons**
| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/salons?city=&category=` | public | Approved salons only |
| GET | `/api/salons/:id` | public | One approved salon |
| GET | `/api/salons/mine` | owner | The owner's salons |
| GET | `/api/salons/pending` | founder | Approval queue |
| GET | `/api/salons/all` | founder | Every salon |
| POST | `/api/salons` | owner | Submit a salon (→ pending) |
| PATCH | `/api/salons/:id/status` | founder | `{ status: approved \| rejected }` |

**Services** (per-salon, owner-managed)
| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/services?salon=<id>` | public | A salon's live menu |
| POST | `/api/services` | owner | Add a service to your salon |
| PATCH | `/api/services/:id` | owner | Edit one of your services |
| DELETE | `/api/services/:id` | owner | Remove one of your services |

Each service belongs to one salon. Owners set the initial menu on the
add-salon form (reviewed with the salon); after approval they edit it live from
the dashboard. A booking's `serviceId` must belong to the salon being booked.

**Bookings**
| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/api/bookings` | customer | Create (server computes price) |
| POST | `/api/bookings/:id/cancel` | customer | Cancel → refund `{ method: wallet \| upi }` |
| GET | `/api/bookings/mine` | customer | Own bookings |
| GET | `/api/bookings/owner` | owner | Bookings across the owner's salons |
| GET | `/api/bookings/all` | founder | Every booking |

**Wallet & notifications**
| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/wallet` | customer | Balance + ledger |
| GET | `/api/notifications` | any | Inbox for the caller's role |
| POST | `/api/notifications/read` | any | Mark all read |

Refunds follow the spec: **wallet is instant** (credited immediately, ledger
entry created), **UPI is marked `processing`** (settles in 2–3 days, no wallet
credit). Cancelling never hands back the first-booking discount.

## Pricing is server-authoritative

`POST /api/bookings` **ignores any price the client sends** and recomputes from
`src/lib/pricing.js`:

- First booking + online → 10% off (once per customer, tracked by prior bookings)
- Second online booking → no discount
- Offline (cash) → no discount, `payee: salon`, `dueAtSalon: total`
- Online → `payee: founder`, `dueAtSalon: 0`
- Commission is 0 (one constant to change later)

Home-service bookings require an address and are rejected if the salon doesn't
offer home service.

## What's stubbed (by design)

- **SMS** — `src/lib/sms/` logs the code; swap for MSG91/Twilio.
- **Payments** — modelled (payee, dueAtSalon, online vs cash) but no real charge.
  Razorpay goes in `src/lib/payments/`. Routing all online money to the founder
  needs a licensed payment aggregator with split settlement before real money
  moves — a business/licensing step, not a code one.

## Structure

```
src/
  config/    env, db (Atlas + in-memory fallback), roles
  models/    User, Otp, Salon, Service, Booking, Notification, WalletTxn
  middleware/ auth (JWT + role), validate (zod), error
  lib/       pricing, jwt, otp, money, notify, sms/ (adapter)
  routes/    auth, salons, services, bookings, notifications, wallet
  seed/      seed data + idempotent seeder
```
