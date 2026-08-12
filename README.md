# eNai - Premium Barber Booking Platform

eNai is a modern, full-stack web application designed to connect customers with premium barbers and salons. It allows shop owners to manage their services, barbers, and bookings, while providing a seamless booking experience for customers.

> *Note: This project was scaffolded with AI-assisted tooling to accelerate boilerplate and infrastructure setup. The core logic, database modeling, payment integrations, and authentication flows were implemented and are fully understood by the author.*

## 🚀 Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Routing:** wouter
- **Styling:** Tailwind CSS v4, Framer Motion
- **UI Components:** Shadcn UI (Radix UI)
- **Data Fetching:** TanStack React Query v5
- **Forms:** React Hook Form + Zod

### Backend
- **Runtime:** Node.js (v20+)
- **Framework:** Express 5
- **Database ORM:** Drizzle ORM
- **Database:** PostgreSQL (via `pg` driver)
- **Authentication:** JWT, bcryptjs, MSG91 (OTP)
- **File Storage:** Google Cloud Storage
- **Payments:** Razorpay (Webhooks & Order Verification)

### Shared / Monorepo Tools
- **Package Manager:** pnpm workspaces
- **Validation:** Zod (Shared contracts between frontend/backend)

## 📦 Project Structure

The repository is structured as a monorepo using pnpm workspaces:

- `artifacts/barber-booking/` - The React frontend application.
- `artifacts/api-server/` - The Express backend application.
- `lib/db/` - Drizzle ORM schemas, migrations, and seed scripts.
- `lib/api-zod/` - Shared Zod validation schemas.
- `lib/api-client-react/` - Auto-generated React Query hooks for the API.

## 🛠️ How to Run Locally

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Setup Instructions

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory and configure the necessary variables (Database URL, JWT Secret, Razorpay keys, MSG91 token, etc.). See `.env.example` if available.

3. **Database Migrations:**
   ```bash
   pnpm --filter @workspace/db run push
   ```

4. **Start the Development Servers:**
   ```bash
   pnpm run dev
   ```
   This will start both the Express backend and the Vite frontend concurrently.

## 💳 Key Features

- **OTP Authentication:** Secure, passwordless customer login via MSG91.
- **Role-Based Access:** Distinct interfaces for Customers and Shop Owners/Admins.
- **Dynamic Slot Booking:** Intelligent scheduling to prevent double-bookings.
- **Payment Processing:** Integrated Razorpay checkout with secure backend webhook verification.
- **Media Management:** GCS-backed image uploads for shop portfolios and profiles.
