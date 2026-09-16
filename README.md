# eNai — Premium Barber Booking Platform

eNai is a full-stack barber-shop discovery and appointment booking platform built for the Indian market. Customers find nearby shops, browse services, and pay a ₹1 token fee via Razorpay to reserve a time slot. Shop owners manage services, schedules, bookings, and revenue from a dedicated dashboard.

> **Live:** [enai-barber-booking.vercel.app](https://enai-barber-booking.vercel.app) · API: [enai-api-server.vercel.app](https://enai-api-server.vercel.app)

---

## Features

### For Customers
- **OTP Login** — Passwordless phone authentication via MSG91 widget
- **Shop Discovery** — Search by name or city, filter by gender (Male / Female / Unisex), sort by distance or price
- **Geolocation Sorting** — Shops sorted by proximity using the Haversine formula when location access is granted
- **Favourites** — Star shops to pin them at the top of the list (persisted in localStorage)
- **Live Availability** — See real-time open/closed status and available time slots
- **Service Selection** — Browse each shop's services with prices and durations
- **Slot Booking** — Pick a date and time, pay ₹1 platform fee via Razorpay, and receive a 4-digit arrival OTP
- **Booking Management** — View upcoming and past appointments, cancel bookings

### For Shop Owners
- **Registration & Login** — Phone + password authentication with JWT sessions
- **Shop Creation** — Multi-step form with name, city, address, pincode, number of chairs/barbers, target gender, opening hours, and Google Maps location picker
- **Owner Dashboard** — Today's bookings, revenue, active slots, available chairs, weekly stats
- **Service Management** — Create, edit, toggle, and delete services with name, price, and duration
- **Schedule Management** — Set open/closed days and per-day open/close hours
- **Photo Management** — Upload profile photo, interior photos, and a portfolio gallery (backed by Google Cloud Storage)
- **Shop Status Control** — Toggle open/closed, pause bookings for N minutes
- **OTP Verification** — Verify a customer's 4-digit arrival OTP to mark them as present
- **Booking Lifecycle** — Confirmed → Active → Completed / No-Show (with undo)
- **Activity Log & Revenue Charts** — Timeline view, activity feed, and revenue breakdown by period

### Platform / Admin
- **Admin Panel** — Password-protected admin dashboard to approve/reject pending shops
- **Auto-Verification** — New shops are auto-verified for immediate customer visibility
- **Rate Limiting** — Auth endpoints are rate-limited (10 requests per 15 minutes)
- **Race Condition Protection** — `FOR UPDATE` row-level locks prevent double-booking the same chair

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, TypeScript |
| **Routing** | wouter |
| **Styling** | Tailwind CSS v4, Framer Motion |
| **UI Components** | Radix UI (shadcn/ui), Lucide Icons |
| **Data Fetching** | TanStack React Query v5 |
| **Forms** | React Hook Form + Zod |
| **Backend** | Node.js 20+, Express 5, TypeScript |
| **Database** | PostgreSQL (Supabase) |
| **ORM** | Drizzle ORM |
| **Auth** | JWT (bcryptjs), MSG91 OTP |
| **Payments** | Razorpay (Orders API + Webhook Signature Verification) |
| **File Storage** | Google Cloud Storage |
| **Monorepo** | pnpm workspaces |
| **Deployment** | Vercel (frontend + API as serverless) |

---

## Project Structure

```
enai/
├── artifacts/
│   ├── api-server/          # Express backend (REST API)
│   │   └── src/
│   │       ├── routes/      # auth, shops, services, bookings, payments, storage, admin, barbers, health
│   │       ├── middleware/   # JWT auth middleware (owner + customer)
│   │       └── lib/         # auth utils, SMS, slot assignment
│   └── barber-booking/      # React frontend (Vite)
│       └── src/
│           ├── pages/       # Landing, CustomerLogin, CustomerHome, ShopPage, Login, Register, CreateShop, Dashboard, Admin
│           ├── components/  # BrandMark, CustomerOnboarding, ImageUpload, LocationPicker, WeeklyScheduleModal, AvatarCrop
│           └── lib/         # auth context, customerAuth context
├── lib/
│   ├── db/                  # Drizzle ORM schema, migrations, config
│   ├── api-zod/             # Shared Zod validation schemas (frontend ↔ backend contracts)
│   ├── api-client-react/    # Auto-generated React Query hooks for the API
│   └── object-storage-web/  # GCS upload utilities for the browser
├── .env                     # Environment variables (not committed)
├── pnpm-workspace.yaml      # Workspace configuration + dependency catalog
└── tsconfig.base.json       # Shared TypeScript config
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new shop owner |
| POST | `/api/auth/login` | Owner login (phone + password) |
| POST | `/api/auth/send-otp` | Send OTP to customer phone |
| POST | `/api/auth/verify-otp` | Verify customer OTP |
| POST | `/api/auth/verify-msg91` | Verify via MSG91 widget callback |

### Shops
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/shops` | List verified shops (supports `?q=`, `?city=`, `?limit=`) |
| POST | `/api/shops` | Create a new shop (owner auth) |
| GET | `/api/shops/:slug` | Get shop details + services |
| PATCH | `/api/shops/:slug/status` | Toggle open/closed, pause bookings |
| PATCH | `/api/shops/:slug/settings` | Update shop info |
| GET | `/api/shops/:slug/dashboard` | Dashboard stats (owner auth) |
| PATCH | `/api/shops/:slug/photos` | Update profile/interior photos |
| POST | `/api/shops/:slug/portfolio` | Add portfolio photo |
| DELETE | `/api/shops/:slug/portfolio/:index` | Remove portfolio photo |
| PATCH | `/api/shops/:slug/schedule` | Update open days and hours |

### Services
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/shops/:slug/services` | List active services |
| POST | `/api/shops/:slug/services` | Create service (owner auth) |
| PATCH | `/api/shops/:slug/services/:id` | Update service |
| DELETE | `/api/shops/:slug/services/:id` | Delete service |

### Bookings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/shops/:slug/slots/:date/:serviceId` | Get available time slots |
| POST | `/api/shops/:slug/bookings` | Create booking (walk-in) |
| GET | `/api/shops/:slug/bookings` | List bookings (owner auth) |
| POST | `/api/shops/:slug/bookings/:id/verify-otp` | Verify arrival OTP |
| POST | `/api/shops/:slug/bookings/:id/complete` | Mark as completed |
| POST | `/api/shops/:slug/bookings/:id/no-show` | Mark as no-show |
| POST | `/api/shops/:slug/bookings/:id/undo-no-show` | Undo no-show |
| GET | `/api/shops/:slug/timeline/:date` | Timeline view |
| GET | `/api/shops/:slug/activity` | Activity feed |
| GET | `/api/shops/:slug/revenue` | Revenue breakdown |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments/create-order` | Create Razorpay order (amount from DB) |
| POST | `/api/payments/verify` | Verify Razorpay signature + create booking |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/shops/pending` | List unverified shops |
| POST | `/api/admin/shops/:id/approve` | Approve a shop |
| POST | `/api/admin/shops/:id/reject` | Reject a shop |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL database (or a free [Supabase](https://supabase.com) project)

### Setup

1. **Clone & install**
   ```bash
   git clone https://github.com/archishbhatt7-bit/enai.git
   cd enai
   pnpm install
   ```

2. **Configure environment** — create a `.env` in the project root:
   ```env
   DATABASE_URL=postgresql://...          # Supabase connection pooler URL (IPv4)
   PORT=3000
   JWT_SECRET=<random-64-char-hex>
   ADMIN_PASSWORD=<strong-password>

   # Optional — Razorpay (mock mode if not set)
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=...

   # Optional — MSG91 OTP
   MSG91_AUTH_KEY=...
   MSG91_WIDGET_ID=...

   # Optional — Google Cloud Storage
   GCS_BUCKET=...
   GCS_KEY_FILE=...
   ```

3. **Push database schema**
   ```bash
   pnpm --filter @workspace/db run push
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 — Backend (http://localhost:3000)
   cd artifacts/api-server && pnpm run dev

   # Terminal 2 — Frontend (http://localhost:5173)
   cd artifacts/barber-booking && pnpm run dev
   ```

---

## Database Schema

| Table | Purpose |
|---|---|
| `owners` | Shop owner accounts (phone, password hash, name) |
| `shops` | Shop profiles (name, slug, location, hours, photos, status) |
| `services` | Services offered by each shop (name, price, duration) |
| `bookings` | Customer appointments (slot date/time, chair, status, OTP, payment) |
| `otp_sessions` | Temporary OTP records for customer login |
| `photo_store` | GCS object metadata |

---

## Deployment

Both the frontend and API server are deployed on **Vercel**:

- **Frontend** (`enai-barber-booking`) — Vite static build, deployed from `artifacts/barber-booking/`
- **API Server** (`enai-api-server`) — esbuild-bundled Express app deployed as a Vercel Serverless Function from `artifacts/api-server/`

Environment variables (`DATABASE_URL`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, etc.) are configured in each Vercel project's settings.

---

## License

MIT
