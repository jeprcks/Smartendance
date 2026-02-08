# Deploy backend to Vercel (smartendance-api.vercel.app)

The backend is set up for Vercel’s Express support. To fix **404 / DEPLOYMENT_NOT_FOUND**:

## 1. Create or fix the Vercel project

- In [Vercel Dashboard](https://vercel.com/dashboard), create a **new project** (or use the one for `smartendance-api.vercel.app`).
- **Root Directory:** set to **`server`** (so `index.js` and `app.js` are at the project root).
- Connect the same repo as your admin web (e.g. Smartendance), and choose the **server** folder as root when prompted, or set it under **Settings → General → Root Directory**.

## 2. Environment variables

In the backend project: **Settings → Environment Variables**. Add at least:

| Name           | Value (example)                    |
|----------------|------------------------------------|
| `MONGODB_URI`  | `mongodb+srv://...`                |
| `JWT_SECRET`   | your secret string                 |

Optional (for Telegram, etc.): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_NOTIFICATION_ENABLED`, `NODE_ENV=production`, `ALLOWED_ORIGINS`.

## 3. Deploy

- **Commit and push** the latest code (including `server/app.js`, `server/api/index.js`, `server/vercel.json`).
- **Deploy** (or **Redeploy**). All requests are sent to `api/index.js` (Express app). After deploy, opening the root URL should return JSON `{"ok":true,...}`, not raw source code.

## 4. Domain

- If the project has no domain yet: **Settings → Domains** → add `smartendance-api.vercel.app` (or your chosen subdomain).
- After a successful deployment, `https://smartendance-api.vercel.app/api/users/login` (and other `/api/*` routes) should respond instead of 404.

## Local development

- Run as before: `npm start` or `npm run dev` in the **server** folder. The app uses `index.js` and starts the HTTP server locally.
