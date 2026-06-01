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
| **Settings** | Email, WhatsApp, Branding config |

### Integrations
- 📧 **Gmail SMTP** — Send project details, quotations, reminders
- 💬 **WhatsApp Cloud API** — Automated lead nurturing messages
- ☁️ **Cloudinary** — Document & image storage
- 📊 **Recharts** — Interactive business dashboards

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
| `WHATSAPP_PHONE_ID` | WhatsApp Phone Number ID | Optional |
| `WHATSAPP_ACCESS_TOKEN` | Meta API access token | Optional |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary secret | Optional |
| `FRONTEND_URL` | Frontend URL for CORS | ✅ |

### Web (`apps/web/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Express API URL | ✅ |

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