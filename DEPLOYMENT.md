# Aarovia CRM Deployment Guide

## Production Domain
- Frontend: `https://aarovia.co.in`
- Frontend alternate: `https://www.aarovia.co.in`
- Backend API: `https://api.aarovia.co.in`

## Vercel Setup

### 1. API Project
- Root Directory: `apps/api`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Example env file: `apps/api/.env.example`

#### Required Environment Variables
- `NODE_ENV=production`
- `DATABASE_URL` - production PostgreSQL connection string
- `JWT_SECRET` - strong JWT secret
- `ACCESS_TOKEN_EXPIRES_IN=15m`
- `REFRESH_TOKEN_EXPIRES_IN=30d`
- `COOKIE_DOMAIN=.aarovia.co.in`
- `JWT_EXPIRES_IN=7d`
- `FRONTEND_URL=https://aarovia.co.in,https://www.aarovia.co.in`
- `SMTP_HOST` - SMTP hostname (optional if using Gmail)
- `SMTP_PORT` - SMTP port (465 or 587)
- `SMTP_SECURE=true` or `false`
- `SMTP_USER` - SMTP username / API key
- `SMTP_PASS` - SMTP password / API secret
- `GMAIL_USER` - Gmail address (optional; use with `GMAIL_APP_PASSWORD`)
- `GMAIL_APP_PASSWORD` - Gmail App Password (optional; use this instead of `SMTP_PASS` when sending through Gmail)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `WHATSAPP_PHONE_ID` (optional)
- `WHATSAPP_ACCESS_TOKEN` (optional)

### 2. Web Project
- Root Directory: `apps/web`
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Example env file: `apps/web/.env.example`

#### Required Environment Variables
- `NEXT_PUBLIC_API_URL=https://api.aarovia.co.in`
- `NEXT_PUBLIC_APP_NAME=Aarovia CRM`
- `NEXT_PUBLIC_APP_URL=https://www.aarovia.co.in`

## DNS Setup

### Frontend
- Add CNAME record for `aarovia.co.in` pointing to Vercel alias target.
- Add CNAME record for `www.aarovia.co.in` pointing to the same Vercel alias target.

### API
- Add CNAME or A record for `api.aarovia.co.in` as required by Vercel.

## Production Database

1. Create a managed PostgreSQL instance.
2. Set `DATABASE_URL` in the API project.
3. Run migrations in production:
```bash
npx prisma migrate deploy
```
4. Seed if needed:
```bash
npx prisma db seed
```

## Notes
- `apps/api/src/index.ts` already allows production CORS for `https://aarovia.co.in`.
- Email sends now support both Gmail and custom SMTP providers.
- Make sure `FRONTEND_URL` and `NEXT_PUBLIC_APP_URL` use `https://aarovia.co.in`.
- For local testing, use `http://localhost:5000` for API and `http://localhost:3000` for frontend.
- The API now uses HTTP-only refresh cookies for session persistence, so frontend requests must include `credentials` and the API must allow `Access-Control-Allow-Credentials`.
