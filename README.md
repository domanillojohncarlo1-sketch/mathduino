# ♻️ MathDuino — ESP32 Recycling & Math Quiz Station

A full-stack web companion for an ESP32-powered school recycling + math practice station.
Students deposit bottles at the physical MD-01 machine (RFID + 16x2 LCDs), earn points,
practice timed math quizzes, and redeem eco-rewards — while teachers/admins monitor
stations, manage users, and fulfil reward orders.

**Two role-verified portals**

| Portal | What it does |
| --- | --- |
| 🎓 **Student** | Live LCD mirror · bottle deposits · 5-question timed quiz · points reward shop · **My Orders tracker** (pending → ready → received, with full date/time timeline, self-service remove & refund) |
| 🛡️ **Admin** | Live station telemetry (CPU/RAM/temp) · system logs · user management · **Order Management** (mark ready / received / cancel-with-auto-refund) · hardware config |

**Auth**: email + password sign-up/sign-in, **admin access-code verification**, and
simulated Google / GitHub / Facebook OAuth consent flows. Sessions work over both
httpOnly cookies *and* `Authorization: Bearer` tokens — which is exactly what makes
ESP32 integration trivial (see below).

---

## 🧰 Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (dark eco theme, emerald glow)
- **Prisma ORM** + **SQLite** (zero-config local database)
- **scrypt** password hashing + DB-backed sessions
- Framer Motion · Sonner toasts · date-fns

## 🚀 Quick Start

```bash
# 1. install dependencies (bun or npm both work)
bun install

# 2. configure environment
cp .env.example .env        # DATABASE_URL already points to db/custom.db

# 3. create the database schema
bun run db:push

# 4. (optional) seed demo accounts + sample orders
bun prisma/seed.ts

# 5. run
bun run dev                 # http://localhost:3000
```

### Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@mathduino.io` | `student123` |
| Admin | `admin@mathduino.io` | `admin123` |

> Admin sign-ups via the **SIGN UP** tab require the access code `MD-ADMIN-2025`.
> Social buttons use simulated provider personas — swap in real NextAuth OAuth
> credentials to go live.

## 🔌 API Reference (ESP32-facing)

All endpoints are relative to your deployment root. Machine clients should use the
**Bearer token flow** — no cookies required.

### 1. Sign in → get a session token

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "student@mathduino.io", "password": "student123" }
```

```json
{ "user": { "id": "...", "points": 220, "bottles": 15, "bottlesGoal": 50, "...": "..." },
  "token": "64-char-hex-session-token" }
```

### 2. Push machine events

```http
POST /api/student/events
Authorization: Bearer <token>
Content-Type: application/json

{ "type": "recycle" }                  // +1 bottle, +POINTS_PER_BOTTLE points
{ "type": "quiz", "delta": 15 }        // quiz bonus, clamped 0..25 by the server
```

The response returns the fresh `user` object (new `points` / `bottles`) — render that
on the device LCD. When `capped: true`, the weekly bottle goal is reached.

### 3. Reward orders

```http
GET    /api/student/orders              → list the student's orders (newest first)
POST   /api/student/orders              → { "itemName": "Bamboo Ruler", "cost": 60 }
DELETE /api/student/orders              → { "orderId": "..." }  (PENDING = auto-refund)
GET    /api/admin/orders                → all orders + status counts   (admin session)
PATCH  /api/admin/orders                → { "orderId", "action": "ready"|"received"|"cancel" }
```

Order statuses: `PENDING → READY → RECEIVED`, or `CANCELLED` (auto point-refund).
Students may self-remove `PENDING` (full refund) / `RECEIVED` / `CANCELLED` history.

### 4. Machine flow — bottle deposit at the physical station (recommended)

The ESP32 doesn't log in as anyone — it scans the student's **RFID card** and posts
the deposit with a shared device key. The web portal auto-syncs within seconds
(points, bottles, LCD mirror and order badge all update live).

```http
POST /api/device/events
X-Device-Key: <MD_DEVICE_KEY>          # set in .env — shown in Admin → Hardware Config
Content-Type: application/json

{ "rfid": "RF-8823-1145", "type": "recycle" }
```

```json
{ "user": { "points": 230, "bottles": 16, "...": "..." },
  "lcd": { "line1": "BOTTLE ACCEPTED", "line2": "+10 PTS 16/50" },
  "capped": false }
```

Draw `lcd.line1` / `lcd.line2` straight on the 16x2 display — the site mirrors the
exact same message. `403` returns `CARD BLOCKED / SEE ADMIN` LCD strings for
suspended accounts; `404` = unknown card.

### Minimal ESP32 example (Arduino / C++)

```cpp
// After WiFiClientSecure + ArduinoJson are set up:
// 1) every bottle deposit — student tapped their RFID card:
http.begin(String(SERVER) + "/api/device/events");
http.addHeader("X-Device-Key", DEVICE_KEY);      // from Admin → Hardware Config
http.addHeader("Content-Type", "application/json");
int code = http.POST("{\"rfid\":\"" + cardId + "\",\"type\":\"recycle\"}");
// parse resp["lcd"]["line1"] / ["line2"] and draw them on the 16x2 LCD;
// resp["capped"] == true → weekly goal reached

// 2) alternative: drive events from a logged-in student session instead
http.POST("{\"email\":\"student@mathduino.io\",\"password\":\"student123\"}");
String token = jsonDoc["token"].as<String>();    // then Bearer-flow /api/student/events
```

## ☁️ Publishing (GitHub + Vercel)

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/<you>/mathduino.git
   git push -u origin main
   ```
2. **Create a free Turso database** (hosted SQLite — persistent on Vercel):
   * Sign up at [turso.app](https://turso.app) → **Create database** (name it `mathduino`, location closest to your school)
   * Copy the **Database URL** (looks like `libsql://mathduino-<you>.turso.io`)
   * Create a **database token** and copy it (long `eyJ…` string)
3. **Deploy on [Vercel](https://vercel.com)** (free hobby plan, native Next.js support):
   * Import the repo → framework auto-detected → Deploy once (it will build fine even before env vars)
   * Then **Settings → Environment Variables** and add exactly these three:

     | Name | Value | Notes |
     |------|-------|-------|
     | `DATABASE_URL` | `libsql://mathduino-<you>.turso.io` | from Turso |
     | `DATABASE_AUTH_TOKEN` | `eyJ…` | the Turso database token |
     | `MD_DEVICE_KEY` | any long random string | must match the ESP32 firmware's key |

   * **Redeploy** so the new env vars take effect
4. **Create the tables in Turso** (one-time, from your PC):
   ```bash
   # .env → TURSO_DATABASE_URL / TURSO_AUTH_TOKEN (same values as Vercel)
   bun install
   bun run db:push:turso
   ```
   Users then sign up in the app itself (admin registration code: `MD-ADMIN-2025`).
5. Point the ESP32 firmware's `SERVER` constant at that URL (use HTTPS; the ESP32's
   TLS stack accepts Vercel's certs — set the root CA or use `client.setInsecure()` for prototyping).

> **Why not plain SQLite on Vercel?** The serverless filesystem is **ephemeral** —
> a `file:` database would be wiped between requests. Turso speaks the same SQLite
> dialect over the network, so this repo runs **both** ways unchanged:
> `file:` locally, `libsql://` in production — picked automatically at runtime.

Alternatives that run this repo as-is: Railway · Render · Fly.io · a Raspberry Pi
at home (then expose via Cloudflare Tunnel).

## 📁 Project Layout

```
src/app/page.tsx                  # role router (auth gate → student/admin portal)
src/app/api/auth/*                # signup · login · social · session · logout
src/app/api/student/events        # recycle / quiz event ingestion
src/app/api/student/orders        # place · list · remove(+refund) orders
src/app/api/admin/orders          # fulfilment: ready / received / cancel
src/components/mathduino/         # portals, LCD mirror, quiz, shop, order views
prisma/schema.prisma              # User · Session · Order models
prisma/seed.ts                    # demo accounts + sample data
```

---

Eco-Tech Club © 2025 · Built for the MD-01 Library Corridor station 🌱
