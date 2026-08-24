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

Two themes over one set of semantic tokens in
[`tokens.css`](src/styles/tokens.css): `:root` is the cream/gold customer theme,
`[data-theme="admin"]` is the charcoal/gold panel theme for the owner and founder
dashboards. Components reference only semantic names, so a surface changes theme
by which wrapper it sits in. Gold splits into `--gold` (fills) and `--gold-deep`
(the only gold that passes contrast as text on cream).

## Built so far

Foundation and the complete customer journey: choose salon → salon detail →
service, at-salon/home, professional, date and slot → payment → OTP →
confirmation → bookings, cancellation, refunds, wallet, account.

**Not built yet:** the owner panel (add salon, manage bookings) and the founder
admin (KPIs, approvals queue, cash ledger). The data model and approval states
already support both — `setSalonStatus` and the `owner:` / `founder` notification
audiences are wired and unused.

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
