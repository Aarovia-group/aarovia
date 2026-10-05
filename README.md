# 🏢 Aarovia Real Estates CRM

Enterprise-grade Real Estate CRM platform built for Aarovia Real Estates.

**Live URL:** https://crm.aarovia.co.in  
**Stack:** Next.js 15 · Node.js/Express · PostgreSQL · Prisma · Tailwind CSS

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Local)](#quick-start-local)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment (Vercel)](#deployment-vercel)
- [Deployment Guide](DEPLOYMENT.md)
- [Default Credentials](#default-credentials)
- [API Documentation](#api-documentation)
- [User Roles & Permissions](#user-roles--permissions)

---

## ✨ Features

### Core Modules
| Module | Description |
|--------|-------------|
| **Dashboard** | Real-time stats, revenue charts, pipeline overview |
| **Lead Management** | Full CRM pipeline with Kanban & list views |
| **Inventory** | Unit-level tracking with visual heatmap |
| **Quotations** | Auto-calculated quotes with GST, milestones |
| **Bookings** | End-to-end booking management |
| **Collections** | Payment tracking & overdue alerts |
| **Post Sales** | Agreement & KYC documentation |
| **Invoicing** | GST invoice generation |
| **Reports** | Analytics with Recharts visualizations |
| **Notifications** | In-app, Email, WhatsApp alerts |
| **Team Management** | Role-based user management |
| **Settings** | Email, WhatsApp, SMS, Branding config |

### Integrations
- 📧 **Gmail SMTP** — Send project details, quotations, reminders
- 💬 **WhatsApp Cloud API** — Automated lead nurturing messages
- 📱 **Twilio SMS** — Send SMS directly from lead profiles
- ☁️ **Cloudinary** — Document & image storage
- 📊 **Recharts** — Interactive business dashboards

### Role-Based Module Access
Module visibility and access are enforced in both the CRM navigation/pages and API:

| Role | Default modules |
|------|-----------------|
| **Super Admin / Admin** | All modules; only Super Admins can create or manage Super Admin accounts |
| **Sales Manager** | Dashboard, leads, customers, inventory, quotations, bookings, post sales, email, WhatsApp, reports, notifications |
| **Sales Executive** | Dashboard, leads, customers, inventory, quotations, bookings, email, WhatsApp, notifications |
| **Telecaller** | Dashboard, leads, customers, notifications |
| **Accounts** | Dashboard, customers, bookings, invoices, collections, WhatsApp payment reminders, reports, notifications, documents |
| **CRM Team** | Dashboard, leads, customers, bookings, collections, post sales, email, WhatsApp, notifications, documents |
| **Post Sales** | Dashboard, customers, bookings, collections, post sales, notifications, documents |

Team creation and role changes require an admin account. API authorization remains authoritative even if a restricted page is opened directly. These defaults control module access; record-level ownership filtering is not configured by this matrix.

Admins can transfer all active leads from one agent to another on the Leads page. The CRM confirms the active lead count, preserves lead records and existing history, and records each transfer in the lead activity timeline.

---

## 🛠 Tech Stack

```
Frontend:  Next.js 15 (App Router) · TypeScript · Tailwind CSS
Backend:   Node.js · Express · TypeScript
Database:  PostgreSQL · Prisma ORM
Auth:      JWT · RBAC (8 roles)
State:     Zustand · React Query
Forms:     React Hook Form · Zod
Charts:    Recharts
Storage:   Cloudinary / AWS S3
Email:     Gmail SMTP (Nodemailer)
WhatsApp:  Meta Cloud API
Deploy:    Vercel
```

---

## 📁 Project Structure

```
aarovia-crm/
├── apps/
│   ├── web/                     # Next.js 15 Frontend
│   │   ├── app/
│   │   │   ├── auth/login/      # Login page
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── leads/           # Lead management + detail
│   │   │   ├── customers/       # Customer profiles
│   │   │   ├── inventory/       # Inventory heatmap
│   │   │   ├── quotations/      # Quotation builder
│   │   │   ├── bookings/        # Booking management
│   │   │   ├── collections/     # Payment tracking
│   │   │   ├── invoices/        # Invoice management
│   │   │   ├── post-sales/      # Agreement tracking
│   │   │   ├── reports/         # Analytics
│   │   │   ├── notifications/   # Alert center
│   │   │   ├── team/            # User management
│   │   │   └── settings/        # System settings
│   │   ├── components/
│   │   │   ├── layout/          # AppLayout, Sidebar, Topbar
│   │   │   └── ui/              # Reusable UI components
│   │   └── lib/
│   │       ├── api.ts           # Axios API client + all endpoints
│   │       ├── utils.ts         # Formatters, constants
│   │       └── store/           # Zustand auth store
│   │
│   └── api/                     # Express Backend
│       ├── src/
│       │   ├── controllers/     # Business logic (16 controllers)
│       │   ├── routes/          # Express routes (18 route files)
│       │   ├── middleware/      # Auth, error handling
│       │   └── utils/           # Prisma client singleton
│       └── prisma/
│           ├── schema.prisma    # Full DB schema (16 models)
│           └── seed.ts          # Sample data seeder
└── package.json                 # Monorepo root
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/aarovia-crm.git
cd aarovia-crm
npm install
```

### 2. Setup Environment Variables

```bash
# API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your DB, JWT, Gmail, WhatsApp credentials

# Web
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env with your API URL
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate

# Seed sample data
npm run db:seed
```

### 4. Start Development Servers

```bash
# Start both API and Web simultaneously
npm run dev

# Or individually:
# API  → http://localhost:5000
# Web  → http://localhost:3000
 - Run `npm run build --workspace=apps/web` to test production build locally
```

---

## 🔐 Environment Variables

### API (`apps/api/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | JWT signing key (min 32 chars) | ✅ |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) | ✅ |
| `GMAIL_USER` | Gmail address for SMTP | ✅ |
| `GMAIL_APP_PASSWORD` | Gmail App Password | ✅ |
| `SMTP_HOST` | SMTP hostname for alternate provider | Optional |
| `SMTP_PORT` | SMTP port (usually 465 or 587) | Optional |
| `SMTP_SECURE` | `true` if using SSL/TLS | Optional |
| `SMTP_USER` | SMTP username / API key | Optional |
| `SMTP_PASS` | SMTP password / API secret | Optional |
| `WHATSAPP_PHONE_ID` | WhatsApp Phone Number ID | Optional |
| `WHATSAPP_ACCESS_TOKEN` | Meta API access token | Optional |
| `SMS_TWILIO_ACCOUNT_SID` | Twilio Account SID for SMS | Optional |
| `SMS_TWILIO_AUTH_TOKEN` | Twilio Auth Token for SMS (or use the API key pair) | Optional |
| `SMS_TWILIO_API_KEY_SID` | Twilio API Key SID, alternative to Auth Token | Optional |
| `SMS_TWILIO_API_KEY_SECRET` | Twilio API Key Secret | Optional |
| `SMS_TWILIO_PHONE_NUMBER` | SMS-capable Twilio sender number in E.164 format (use this or a Messaging Service SID) | Optional |
| `SMS_TWILIO_MESSAGING_SERVICE_SID` | Twilio Messaging Service SID (`MG...`), alternative to a direct sender number | Optional |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary secret | Optional |
| `FRONTEND_URL` | Frontend URL for CORS | ✅ |

### Web (`apps/web/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Express API URL | ✅ |

Twilio SMS can also be configured in **CRM Settings → SMS (Twilio)** by an admin. Provide either a Twilio SMS sender number or a Messaging Service SID; a Messaging Service uses its configured SMS-capable senders, so no sender number needs to be entered in the CRM. SMS-specific environment variables override saved values. Generic `TWILIO_*` account credentials can be used for authentication, but the WhatsApp `TWILIO_PHONE_NUMBER` is never reused as an SMS sender. Ensure the sender is approved for messaging your target countries.

---

## 🗃 Database Setup

### Schema Overview (16 Models)

```
Users           → Authentication & RBAC
Projects        → Real estate projects
Leads           → CRM lead tracking
Activities      → Lead activity timeline
CallLogs        → Call history
Notes           → Lead notes
Tasks           → Follow-up tasks
Inventory       → Property units
Customers       → Buyer profiles
Quotations      → Property quotes
PaymentMilestones → Payment schedules
Bookings        → Sale bookings
Invoices        → GST invoices
Payments        → Payment records
Documents       → File storage
Notifications   → Alert system
Settings        → System configuration
```

### Migration Commands

```bash
# Create migration
npx prisma migrate dev --name migration-name

# Apply to production
npx prisma migrate deploy

# Reset database (CAUTION: deletes data)
npx prisma migrate reset

# View DB in browser
npm run db:studio
```

---

## 🚀 Deployment (Vercel)

> For the full production deploy checklist, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Aarovia CRM"
git remote add origin https://github.com/yourusername/aarovia-crm.git
git push -u origin main
```

### Step 2: Deploy API to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Set **Root Directory** to `apps/api`
4. Add Environment Variables (all from `.env.example`)
5. Deploy → Copy the API URL (e.g. `https://aarovia-api.vercel.app`)

> Production API env notes:
> - `FRONTEND_URL=https://crm.aarovia.co.in`
> - `DATABASE_URL` should point to your production PostgreSQL instance
> - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` are required for real SMTP providers
> - If using Gmail, supply `GMAIL_USER` and `GMAIL_APP_PASSWORD`

### Step 3: Deploy Web to Vercel

1. New Project → Same GitHub repo
2. Set **Root Directory** to `apps/web`
3. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://aarovia-api.vercel.app
   ```
4. Deploy

### Step 4: Custom Domain

1. In Vercel Web project → Settings → Domains
2. Add `crm.aarovia.co.in`
3. Update your DNS:
   ```
   CNAME  crm  cname.vercel-dns.com
   ```

### Step 5: Production Database

Use a managed PostgreSQL service:
- **Supabase** (free tier) — supabase.com
- **Neon** (serverless) — neon.tech
- **PlanetScale** — planetscale.com
- **Railway** — railway.app

After creating your database:
```bash
# Update DATABASE_URL in Vercel env vars
# Then run migrations
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx prisma db seed
```

---

## 🔑 Default Credentials

After seeding the database:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@aarovia.co.in | Admin@1234 |
| Sales Manager | manager@aarovia.co.in | Admin@1234 |
| Sales Executive | arjun@aarovia.co.in | Admin@1234 |
| Sales Executive | sanjana@aarovia.co.in | Admin@1234 |
| Telecaller | paresh@aarovia.co.in | Admin@1234 |

> ⚠️ **Change all passwords immediately in production!**

---

## 📡 API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production:  https://aarovia-api.vercel.app/api
```

### Authentication
All protected routes require `Authorization: Bearer <token>` header.

```bash
# Login
POST /api/auth/login
{ "email": "admin@aarovia.co.in", "password": "Admin@1234" }

# Response
{ "success": true, "data": { "user": {...}, "token": "eyJ..." } }
```

### Key Endpoints

| Resource | Endpoints |
|----------|-----------|
| **Auth** | `POST /auth/login` `POST /auth/register` `GET /auth/profile` |
| **Leads** | `GET/POST /leads` `GET/PUT/DELETE /leads/:id` `GET /leads/pipeline` `POST /leads/bulk-import` `PATCH /leads/:id/status` `POST /leads/:id/call-log` |
| **Inventory** | `GET/POST /inventory` `GET /inventory/heatmap/:projectId` `PATCH /inventory/:id/status` |
| **Quotations** | `GET/POST /quotations` `GET/PUT/DELETE /quotations/:id` `PATCH /quotations/:id/status` |
| **Bookings** | `GET/POST /bookings` `GET/PUT /bookings/:id` `POST /bookings/:id/payment` |
| **Customers** | `GET/POST /customers` `GET/PUT /customers/:id` `PATCH /customers/:id/verify-kyc` |
| **Reports** | `GET /reports/dashboard` `GET /reports/monthly-revenue` `GET /reports/lead-sources` `GET /reports/team-performance` |
| **Email** | `POST /email/send-project-details` `POST /email/send-quotation` |
| **WhatsApp** | `POST /whatsapp/send-project-details` `POST /whatsapp/send-followup` `POST /whatsapp/send-payment-reminder` |
| **Notifications** | `GET /notifications` `PATCH /notifications/:id/read` `PATCH /notifications/mark-all-read` |

---

## 👥 User Roles & Permissions

| Role | Leads | Inventory | Quotations | Bookings | Invoices | Reports | Settings |
|------|-------|-----------|------------|----------|----------|---------|----------|
| Super Admin | Full | Full | Full | Full | Full | Full | Full |
| Admin | Full | Full | Full | Full | Full | Full | Most |
| Sales Manager | Full | Read/Update | Full | Full | Read | Full | Read |
| Sales Executive | Own | Read | Create/Read | Create/Read | Read | Own | None |
| Telecaller | Own | None | None | None | None | Own | None |
| Accounts | Read | Read | Read | Read | Full | Full | Read |
| CRM Team | Full | Read | Read | Read | None | Full | Read |
| Post Sales | Read | Read | Read | Full | Read | Read | None |

---

## 📞 Support

For technical issues or feature requests:
- **Email:** tech@aarovia.co.in
- **CRM Domain:** crm.aarovia.co.in

---

© 2024 Aarovia Real Estates. All rights reserved.
#   a a r o v i a c r m 
 
 