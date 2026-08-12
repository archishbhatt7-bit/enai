# eNai Project Memory & Roadmap

This file serves as the memory and context for any new AI agents working on this project. **Always read this file first** to understand the current state of the app, key architectural decisions, and upcoming goals.

## 🏗️ Architecture Overview
*   **Structure:** Monorepo using `pnpm` workspaces.
*   **Frontend (`artifacts/barber-booking`):** React 19, Vite, TailwindCSS v4, React Query, wouter.
*   **Backend (`artifacts/api-server`):** Node.js, Express 5, Drizzle ORM, PostgreSQL.
*   **Shared (`lib/`):** Zod schemas (`api-zod`), API Client hooks (`api-client-react`), DB schema (`db`).

## ✅ Current Progress & Integration Details

### 1. MSG91 OTP Integration (Completed)
We have successfully implemented real OTP login for customers using MSG91.
*   **Client-Side:** We use the custom UI integration (`exposeMethods: true`). 
*   **Critical Detail:** `window.sendOtp` MUST be passed a string (e.g., `"919999999999"`), **not** an object. Wrapping it in an object will cause MSG91 to throw a `500 Internal Server Error`.
*   **Verification:** `window.verifyOtp(otp)` handles verification internally. Upon success, the widget callback hits our backend at `POST /api/auth/verify-msg91` to finalize the session.
*   **Configuration used:**
    *   Widget ID: `366773707859333133323432`
    *   Auth Token: `552017Td8Qszz8w6a5cfaffP1` (Mainsite token).
    *   *Note: If MSG91 throws an `IPBlocked` error, the frontend domain (`enai-barber-booking.vercel.app`) must be whitelisted in the MSG91 Tokens dashboard.*

## 🚀 Future Roadmap & Upcoming Goals

### 1. Persistent OTP Sessions
**Problem:** Currently, the app asks for OTP verification too frequently.
**Goal:** Customers should remain logged in indefinitely unless they manually log out or their session expires after a very long period of inactivity. The app needs to check local storage / cookies efficiently and bypass the OTP screen for returning verified users.

### 2. Razorpay Integration (Completed — Option C)
**Model:** Platform collects ₹5 token fee (or full price as deposit). Barber gets paid directly by customer in person (cash/UPI).
**Flow:**
1. Frontend calls `POST /api/payments/create-order` → backend creates Razorpay order (amount from DB, not client).
2. Frontend opens Razorpay Checkout modal with the `order_id`.
3. On payment success, frontend calls `POST /api/payments/verify` with `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`.
4. Backend verifies HMAC-SHA256 signature using `order_id|payment_id` + `RAZORPAY_KEY_SECRET`. Only if valid, the booking is created.
*   **Dev mode:** When `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are not set, the backend returns a mock order and skips signature verification. This keeps local testing frictionless.
*   **Env vars needed:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (set in `.env` for local, Render dashboard for prod).
*   **Frontend step order:** Service → Slot → Contact → Payment (Razorpay modal) → Confirm.
*   **The old `POST /shops/:slug/bookings` endpoint still works** for backwards compatibility / barber walk-in bookings.

### 3. Race Condition Fix (Completed)
**Problem:** Two concurrent booking requests could read the same chair availability and double-book the same chair.
**Fix:** Added `FOR UPDATE` row-level lock to the `assignChair()` query in `lib/slots.ts`. The second concurrent transaction now blocks until the first commits, ensuring accurate chair counts.

### 4. Mobile Navigation Bug
**Problem:** When a user slides back (back gesture) on mobile devices from the customer dashboard, it incorrectly routes them all the way back to the main landing page.
**Goal:** Fix the router history stack so that the back button behaves natively and predictably on mobile browsers without breaking the authenticated flow.
