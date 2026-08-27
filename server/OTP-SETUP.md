# OTP Login Setup (MSG91 Widget)

Real phone OTP login for SalonSathi, using **MSG91's OTP Widget**. The browser
widget sends + verifies the code (MSG91 handles DLT/sender/template), returns a
JWT access-token, and our backend verifies that token and issues our own 30-day
JWT.

Verified working end to end: SMS delivered → widget verified the code → backend
`verifyAccessToken` → user created + session issued.

---

## How it works

```
Login screen (phone → 6-digit cells)
      │  sendOtp(91XXXXXXXXXX)                    MSG91 sends the SMS
      ▼
   user types code
      │  verifyOtp(code)  ───────────────►  MSG91 verifies, returns access-token (JWT)
      ▼
POST /api/auth/widget-login { accessToken, phone, name }
      │
      ▼
server → MSG91 /widget/verifyAccessToken (authkey + access-token)
      │  success → verified phone
      ▼
find/create User (role from phone) → sign our JWT → { token, user }
```

- Frontend widget glue: [`src/lib/msg91Widget.js`](../src/lib/msg91Widget.js)
- Login wiring: [`src/pages/Login.jsx`](../src/pages/Login.jsx)
- Backend verify + login: [`src/routes/auth.routes.js`](src/routes/auth.routes.js) (`/widget-login`)
- MSG91 call: [`src/lib/sms/msg91.js`](src/lib/sms/msg91.js) (`verifyAccessToken`)

The verified phone comes from **MSG91**, not the client — so the number can't be spoofed.

---

## Configuration

### Frontend — root `.env` (gitignored)

```
VITE_MSG91_WIDGET_ID=<widget id>      # MSG91 → OTP → your widget → Configuration
VITE_MSG91_TOKEN_AUTH=<token auth>    # shown next to it in the same snippet
```

Both are client-side public values. **Blank `VITE_MSG91_WIDGET_ID` to fall back
to the dev OTP flow** (code returned in the API response, no SMS credits used) —
handy for local development.

### Backend — `server/.env` (gitignored)

```
MSG91_AUTHKEY=<auth key>              # MSG91 → Settings → API keys (a server SECRET)
MSG91_TEMPLATE_ID=<template id>       # your approved OTP template (used by the dev/server flow)
```

The widget flow only needs `MSG91_AUTHKEY` (for `verifyAccessToken`). `TEMPLATE_ID`
is used by the fallback Server-OTP flow.

> The live values live in `.env` on each machine and in your MSG91 panel — they
> are intentionally **not** committed here.

---

## The OTP message template

Two options — the widget uses whichever template is set in the **MSG91 widget
panel**, so **neither needs a code change** (our `MSG91_TEMPLATE_ID` env only
affects the server-OTP fallback, not the widget).

### Option A — MSG91 default template (no DLT needed) ← current

Point the widget at **MSG91's default OTP template**. It's already registered
under MSG91's own DLT header, so it delivers immediately with **no DLT
registration on your side**. The message uses MSG91's generic OTP wording (not
SalonSathi branding). This is the simplest path and what we use now.

### Option B — custom branded template (needs your DLT)

To send branded text you must register your own **DLT entity + header + content
template**, then select that template in the widget. Use this text (keep it
identical to the DLT-approved content, or DLT must re-approve a change):

**MSG91 template field (`##OTP##`):**
```
##OTP## is your SalonSathi verification code, valid for 15 minutes. Do not share it with anyone.
```

**DLT portal (`{#var#}`):**
```
{#var#} is your SalonSathi verification code, valid for 15 minutes. Do not share it with anyone.
```

> India requires DLT only for **custom** sender/content. A changed custom
> template stops delivering until DLT re-approves it — that's the "message not
> sending" symptom. Switch the widget back to the default template to deliver
> immediately.

---

## MSG91 widget settings

For the OTP-only login flow, in the widget's settings:

| Setting | Value | Why |
| --- | --- | --- |
| **Captcha Validation** | **Off** for local dev | hCaptcha refuses to run on `localhost`. Turn it **back on in production** (real domain) for bot protection. |
| **Invisible OTP** | **Off** | Invisible OTP verifies silently with no code to type — it conflicts with our explicit 6-digit entry. Off = a normal visible SMS every time. |
| **IP whitelisting** | Add the sending machine's public IP | MSG91 rejects non-whitelisted IPs (error **418**). See below. |

The **"Add Sender ID"** screen (Header + DLT Entity/PE ID) is **not needed** for
OTP — the OTP template already carries its own DLT/header config. Skip it unless
you later send other/transactional SMS.

---

## Gotchas we hit (and the fixes)

| Symptom | Cause | Fix |
| --- | --- | --- |
| MSG91 email: **error 418**, "not submitted" | Sending IP not whitelisted | Whitelist the server's public IP in MSG91 → Settings → Security |
| Same, with a sender set | `abc` is not a valid 6-char DLT header | Leave sender blank (template's own header is used) |
| Widget never fires / `network-error` | **hCaptcha can't run on `localhost`** | Disable Captcha for dev; use a real domain in prod |
| API says success, no SMS, no visible code | **Invisible OTP** verified silently | Disable Invisible OTP |
| API success, request in MSG91 logs, no SMS | **Demo/test number** — provider logs but doesn't deliver | Use a real, non-demo number |

Find any request in **MSG91 → Reports → Logs** by its `request_id` to see the
real delivery status.

---

## Production checklist

- [ ] Serve on a **real domain** (not localhost) — hCaptcha + Invisible OTP then work; re-enable them for bot protection
- [ ] Whitelist the **production server's outbound IP** in MSG91
- [ ] Use the **production** authkey + widget values (kept out of git, set as host env vars)
- [ ] Set `NODE_ENV=production` (the server refuses to boot without a real `JWT_SECRET`, a Mongo URI, and MSG91 configured)
- [ ] Confirm the OTP template is DLT-**approved** and linked to an approved header

---

## Local testing without SMS

To develop without sending real SMS (and without burning credits):

1. Blank `VITE_MSG91_WIDGET_ID` in the root `.env`
2. Restart the Vite dev server

The login then uses the **dev OTP flow**: a code is generated locally and
returned in the `request-otp` response (and shown on the login screen), so you
can sign in instantly with no SMS.
