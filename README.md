# SalonSathi

**Book Your Appointment, Skip The Wait**

A salon booking marketplace for men's salons, unisex salons and beauty parlours
across Lucknow, Mumbai and Delhi NCR. Book at the salon or at home, pay online or
in cash, cancel with an instant wallet refund.

## Running it

```bash
npm install
```

```bash
npm run dev
```

`npm run build` produces a production bundle in `dist/`; `npm run preview` serves it.

## Full stack

This is now a real full-stack app. A Node + Express + Mongoose + MongoDB API
lives in [`server/`](server/), and the React frontend talks to it over HTTP —
no more localStorage store.

**Run both:**

```bash
# terminal 1 — API (uses MongoDB Atlas via server/.env, or in-memory with none)
cd server && npm install && npm run dev

# terminal 2 — web app
npm install && npm run dev
```

The frontend reads the API base from `VITE_API_URL` (defaults to
`http://localhost:4000/api`). Auth is a real OTP → JWT flow; the token is stored
in `localStorage` and the session is restored on load via `/auth/me`. Every
screen — storefront, booking, wallet, owner and founder dashboards — is backed
by the API. Pricing is computed server-side, so the discount and totals can't be
tampered with from the client. See [`server/README.md`](server/README.md) for
the endpoint reference.

The client API layer is [`src/lib/api.js`](src/lib/api.js); all data flows
through [`src/store/AppStore.jsx`](src/store/AppStore.jsx), which fetches from the
API and exposes the same shape the pages already used.

## The six rules, and where they live

| # | Rule | Implementation |
| --- | --- | --- |
| 1 | At Salon / Home Service — the owner decides | `serviceModes` per salon in [`seed.js`](src/data/seed.js). The Where step in [`Book.jsx`](src/pages/Book.jsx) only offers a choice when the salon supports both; home bookings capture an address and add the salon's travel fee |
| 2 | OTP login, remembered 30 days | [`Login.jsx`](src/pages/Login.jsx) → [`AppStore`](src/store/AppStore.jsx). Session carries an `expiresAt`; an expired session is dropped on hydrate |
| 3 | Online → founder, 10% off first booking only; offline → cash to salon; zero commission | All of it in [`pricing.js`](src/lib/pricing.js). `quote()` grants the discount only when `paymentMode === 'online'` **and** the customer has no prior bookings |
| 4 | Pop-up to customer, founder and owner | One `createBooking` fans out to three audiences (`user:`, `owner:`, `founder`) in the store, plus a toast for whoever is signed in |
| 5 | Owner adds salon, founder accepts/declines | Salons carry `status: pending / approved / rejected`. Only `approved` reach `publicSalons`. The seed ships one pending salon so the gate is visible |
| 6 | Cancel → Wallet (instant) / UPI (2–3 days) | `refundFor()` in pricing; the cancel dialog in [`Appointments.jsx`](src/pages/Appointments.jsx). Wallet credits immediately and writes a ledger row; UPI is marked `processing`. Cash bookings correctly refund nothing |

## Structure

```
src/
  assets/       images + the registry every screen imports from
  components/   Header, Footer, Layout, Toast, Protected, Reveal
  data/         seed.js — categories, cities, salons, services, staff
  hooks/        useReveal
  lib/          datetime, money (₹ / en-IN), pricing, storage
  pages/        one component + one stylesheet per screen
  store/        AppStore (domain state) + Prefs (city & category)
  styles/       tokens (dual theme) → blocks → base
```

### State

`AppStore` is a reducer persisted to `localStorage` under a versioned key, so
bookings, wallet balance, notifications and the OTP session survive a reload.
Bump `STORE_VERSION` in [`storage.js`](src/lib/storage.js) to discard old shapes
rather than migrate them.

`Prefs` is separate on purpose — city and category are view preferences, not
domain records, and persist independently of the session.

### Theming

One set of semantic tokens in [`tokens.css`](src/styles/tokens.css), three
resolutions:

| Selector | Theme |
| --- | --- |
| `:root` | cream / gold — customer, light |
| `[data-theme="dark"]` | charcoal / gold — customer, dark |
| `[data-theme="admin"]` | charcoal / gold — owner & founder panels, always dark |

Components reference only semantic names, so a surface changes theme by which
element carries `data-theme`. Gold splits into `--gold` (fills, paired with
`--on-gold`) and `--gold-deep` — the only gold that passes contrast as text.

**Dark mode** offers Light / Dark / System from the header, with System as the
default. Choosing System removes the attribute and lets the
`prefers-color-scheme` query take over; an explicit choice stamps the root and
wins, which is why the media query is guarded with `:not([data-theme="light"])`.
The preference persists, and an inline script in `index.html` applies it before
first paint so dark users never see a flash of cream — keep that script in sync
with the effect in [`Prefs.jsx`](src/store/Prefs.jsx).

Every text token was checked against its background: all pass WCAG AA (4.5:1)
in both themes.

## Roles & dashboards

The phone number you sign in with decides your role
([`identityForPhone`](src/data/seed.js)) — the demo has no user database:

| Role | Demo number | Lands on |
| --- | --- | --- |
| Customer | any other number | the storefront |
| Salon owner | `9811100001` | `/owner` |
| Founder / admin | `9000000000` | `/admin` |

Both staff accounts are one tap away on the login screen. Owners and the founder
keep their *seeded* id as the session userId, which is what ties a logged-in
owner to the salons they own and to the `owner:<id>` notification inbox the
booking flow already writes to.

**Founder admin** (`/admin`, dark [`PanelLayout`](src/panel/PanelLayout.jsx)):
platform KPI tiles, the salon **approval queue** (Approve / Reject → the salon
goes live or stays hidden), all salons with status filters, and an all-bookings
table split by online-vs-cash settlement.

**Owner dashboard** (`/owner`): the owner's own salons and bookings, earnings
split into online (via platform) and cash (collected direct), an **Add salon**
form (rule 5), and a **Services** manager.

Services are **per-salon and owner-managed**. On the Add-salon form the owner
defines the initial menu (prefilled from a category template, fully editable),
which is reviewed together with the salon. Once approved, the owner adds, edits
and removes services live from the Services page — changes reach customers
immediately, no separate approval. Every salon detail and booking page loads the
salon's real menu from the API; the server rejects a booking whose service
doesn't belong to that salon.

Routes are guarded by role via [`Protected`](src/components/Protected.jsx):
signed-out visitors bounce to login with a `next`; a customer hitting `/admin`
is sent home.

## Customer journey

Choose salon → salon detail → service, at-salon/home, professional, date and
slot → payment → OTP → confirmation → bookings, cancellation, refunds, wallet,
account.

## Note on payments

Online payments settle to a single founder account, as specified. That is
collecting money on behalf of other merchants, which in India requires a Payment
Aggregator licence or a licensed PA with split settlement (Razorpay Route,
Cashfree Easy Split). It does not affect this prototype — nothing moves real
money — but the payout logic is deliberately isolated in `pricing.js` so that
change lands in one file.

Commission is `0` by decision and lives in one constant.

## Images

Photography generated with Viewmax (Gemini 3 Pro), resized and re-encoded to
WebP — 69–120 KB each, down from ~2.8 MB. Every screen resolves imagery through
[`src/assets/index.js`](src/assets/index.js).
