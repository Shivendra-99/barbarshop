# BarberNow

A React implementation of the `BarberNow.dc.html` Claude Design prototype — a
barbershop booking marketplace with a dark/gold editorial aesthetic.

## Running it

```bash
npm install
```

```bash
npm run dev
```

`npm run build` produces a production bundle in `dist/`, `npm run preview` serves it.

## Screens

The prototype's eight `sc-if` route branches became real routes:

| Route | Screen |
| --- | --- |
| `/` | Home — hero, featured shops, how it works, testimonials, FAQ |
| `/explore` | Split results list + interactive map with price pins |
| `/shop/:shopId` | Shop detail — services, team, gallery, reviews, booking rail |
| `/booking` | Service / barber / date / time picker with live summary |
| `/verify` | 6-digit OTP with auto-advance, paste and resend countdown |
| `/confirmed` | Booking confirmation |
| `/appointments` | Upcoming and past appointments |
| `/dashboard` | Barber-side dashboard — KPIs, schedule, earnings, requests |

## Structure

```
src/
  assets/        images + the registry every screen imports from
  components/    Header, Footer, Layout, Reveal, ScrollToTop
  data/          shops, services, barbers, reviews, dashboard data
  hooks/         useReveal (scroll-triggered fade-up)
  lib/           datetime helpers (calendar grid, slots, formatting)
  pages/         one component + one stylesheet per screen
  state/         BookingContext — the shared booking selection
  styles/        tokens.css (design tokens) + base.css (reset, primitives)
```

The prototype's single `DCLogic` class held all state. That state is now split:
selections that must survive navigation (shop, service, barber, date, slot, OTP)
live in `BookingContext`; view-local state (open FAQ, active tab, map selection)
stays in the component that owns it.

## Notes on the port

- **Dates are live.** The prototype hardcoded August 2026 with "today" pinned to
  the 15th. `src/lib/datetime.js` derives everything from the real current date,
  so past days grey out and Sundays stay closed on their own.
- **Styling** moved from inline attributes to stylesheets with CSS custom
  properties (`src/styles/tokens.css`), which is what makes hover, focus and
  responsive states possible — the prototype's `style-hover` attribute had no
  real CSS equivalent. Only genuinely dynamic values stay inline.
- **Responsive**: the prototype was desktop-only. Every screen now collapses
  down to 375px.
- **Accessibility**: real `<button>`/`<input>` elements, `aria-pressed` on
  selectable options, `aria-selected` on tabs, labelled OTP cells, visible focus
  rings, and a `prefers-reduced-motion` path that disables all motion.

## Images

The three photographs referenced by the design source could **not** be retrieved.
The design API caps file reads at 256 KiB and each photo is a ~2048px PNG well
over that, so only the top ~13% of each file arrived — non-interlaced, so the
remainder is unrecoverable.

The app therefore ships brand-matched SVG placeholders. To drop in the real
photos: download the three PNGs from the design project, put them in
`src/assets/`, and repoint the three imports at the top of
[`src/assets/index.js`](src/assets/index.js). Nothing else needs to change —
every screen resolves its imagery through that one module.
