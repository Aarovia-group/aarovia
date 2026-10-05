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
- `MCUBE_API_TOKEN` - MCUBE API token
- `MCUBE_AGENT_PHONE_NUMBER` - phone number of an MCUBE executive opted in for outbound calls
- `MCUBE_CLICK_TO_CALL_URL` (optional; defaults to MCUBE outbound-calls endpoint)
- `MCUBE_API_TOKEN_FIELD` (optional; defaults to `HTTP_AUTHORIZATION`)
- `MCUBE_API_TOKEN_PREFIX` (optional)
- `MCUBE_AGENT_FIELD` (optional; defaults to `exenumber`)
- `MCUBE_CUSTOMER_FIELD` (optional; defaults to `custnumber`)
- `MCUBE_REFURL` (optional; defaults to `1`)
- `MCUBE_REFURL_FIELD` (optional; defaults to `refurl`)
- Outbound DIDs are assigned by CRM user: Mahesh, Maruthi, Kalyani, and Nithin rotate across `8071439257` and `8071439583`; Chirag and Amar use `8071439584`; Vinod and Admin/Super Admin roles use `8071439585`. Rotation position is stored in the database and updated under a PostgreSQL advisory lock.

MCUBE callback URL:
- `https://aarovia-api.vercel.app/api/voice/callback`
- Incoming number-to-agent assignments are configured in CRM Settings → Call API. In MCUBE, route each incoming number to the matching agent and include the called number in the callback payload. Outbound click-to-call uses the mapped CRM user's DID request field (configurable as `MCUBE_DID_FIELD`, default `did`).
- `META_LEAD_VERIFY_TOKEN` - Meta webhook verification token
- `META_LEAD_ACCESS_TOKEN` - Meta Page access token for reading lead form submissions
- `META_ADS_ACCESS_TOKEN` - Meta access token with Ads Insights permission
- `META_AD_ACCOUNT_ID` - Meta ad account ID without the `act_` prefix
- `META_APP_ID` - Meta Developer App ID for OAuth connection
- `META_APP_SECRET` - Meta Developer App secret
- `GOOGLE_LEAD_WEBHOOK_KEY` (optional) - shared key for Google lead webhook requests
- `GOOGLE_ADS_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_ADS_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_ADS_REFRESH_TOKEN` - Google Ads OAuth refresh token
- `GOOGLE_ADS_DEVELOPER_TOKEN` - Google Ads developer token
- `GOOGLE_ADS_CUSTOMER_ID` - Google Ads customer ID
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (optional) - Google Ads manager customer ID
- `API_URL` (optional; defaults to `https://aarovia-api.vercel.app`)

OAuth callback URLs to register with the providers:
- Meta: `https://aarovia-api.vercel.app/api/ad-integrations/meta/callback`
- Google: `https://aarovia-api.vercel.app/api/ad-integrations/google/callback`

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
