# Aarovia CRM Deployment Guide

## Production Domain
- Frontend: `https://aarovia.co.in`
- Frontend alternate: `https://www.aarovia.co.in`
- Backend API: `https://aarovia-api.vercel.app`

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
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `WHATSAPP_PHONE_ID` (optional)
- `WHATSAPP_ACCESS_TOKEN` (optional)
- `WHATSAPP_PROVIDER=META` or `TWILIO` (optional; locks provider selection)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` or `TWILIO_API_KEY_SID` + `TWILIO_API_KEY_SECRET`, and `TWILIO_PHONE_NUMBER` (optional)
- `TWILIO_SMS_PHONE_NUMBER` (optional; must be an SMS-enabled Twilio sender; configure separately from the WhatsApp sender)
- `TWILIO_WHATSAPP_TEMPLATE_SID` (optional; use a template with a message body variable `{{1}}`)

### 2. Web Project
- Root Directory: `apps/web`
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Example env file: `apps/web/.env.example`

#### Required Environment Variables
- `NEXT_PUBLIC_API_URL=https://aarovia-api.vercel.app`
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
3. Run production migrations explicitly before deploying schema changes:
```bash
npm run db:deploy --workspace=apps/api
```
Vercel builds do not run database migrations. This keeps a code build from failing or changing the live schema implicitly.
4. Do not run the development seed against production. Provision production users through a trusted administrative process with unique, strong passwords.

## Notes
- `apps/api/src/index.ts` already allows production CORS for `https://aarovia.co.in`.
- Configure Zoho Mail in Settings using `admin@aarovia.co.in`, the Zoho SMTP host for the mailbox's data center (Aarovia India: `smtp.zoho.in`), port 465 (SSL) or 587 (STARTTLS), and the password Zoho accepts for SMTP authentication. The CRM does not create Zoho mailboxes; create and verify the mailbox in Zoho Mail first.
- Make sure `FRONTEND_URL` and `NEXT_PUBLIC_APP_URL` use `https://aarovia.co.in`.
- For local testing, use `http://localhost:5000` for API and `http://localhost:3000` for frontend.
- The API now uses HTTP-only refresh cookies for session persistence, so frontend requests must include `credentials` and the API must allow `Access-Control-Allow-Credentials`.
