# Deploy the Smartendance backend

Your backend is the **server** folder (Node/Express with MongoDB). Deploy it to a host that gives you a public URL, then set that URL as `NEXT_PUBLIC_API_URL` in Vercel.

---

## What you need before deploying

1. **MongoDB database** in the cloud (the server uses `MONGODB_URI`):
   - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier) – create a cluster and get a connection string like:
     `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/smartendance?retryWrites=true&w=majority`
2. **Environment variables** the server expects (see below).

---

## Option A: Deploy with Railway (recommended, simple)

1. **Sign up:** Go to [railway.app](https://railway.app) and sign in with GitHub.

2. **New project:** Click **New Project** → **Deploy from GitHub repo** → choose **Smartendance**.

3. **Set root directory:** Railway may detect the repo root. You need to deploy only the **server** folder:
   - In your project, open **Settings** (or the service settings).
   - Set **Root Directory** (or **Source**) to **`server`** so Railway builds and runs from the `server` folder.

4. **Add environment variables:** In the Railway service → **Variables** (or **Settings → Variables**), add:

   | Variable | Description | Example |
   |----------|-------------|--------|
   | `MONGODB_URI` | MongoDB connection string (required) | `mongodb+srv://user:pass@cluster.mongodb.net/smartendance` |
   | `PORT` | Optional; Railway sets this automatically | `4000` |
   | `NODE_ENV` | Use `production` on Railway | `production` |
   | `TELEGRAM_BOT_TOKEN` | Optional; for Telegram notifications | From BotFather |
   | `TELEGRAM_NOTIFICATION_ENABLED` | Optional | `true` or `false` |
   | `TELEGRAM_ADMIN_CHAT_ID` | Optional | Your Telegram chat ID |
   | `JWT_SECRET` or `SECRET` | If your app uses it for sessions/tokens | Any long random string |

5. **Build & start commands (if needed):**  
   - Build: leave empty or `npm install`  
   - Start: `node index.js` or `npm start` (if you add `"start": "node index.js"` in `server/package.json`).

6. **Deploy:** Railway will build and deploy. Open the **Settings** → **Networking** (or **Generate Domain**) to get a public URL, e.g.  
   `https://smartendance-production.up.railway.app`

7. **Use this URL in Vercel:**  
   In your Vercel project (admin web), set **Environment Variable**:  
   **Key:** `NEXT_PUBLIC_API_URL`  
   **Value:** `https://your-app.up.railway.app` (no trailing slash)  
   Then redeploy the frontend.

---

## Option B: Deploy with Render

1. **Sign up:** Go to [render.com](https://render.com) and sign in with GitHub.

2. **New Web Service:** **New** → **Web Service** → connect the **Smartendance** repo.

3. **Settings:**
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js` (or `npm start` if defined in `server/package.json`)

4. **Environment:** In the **Environment** section, add the same variables as in the table above (`MONGODB_URI`, `NODE_ENV`, `PORT` if needed, Telegram vars, etc.).

5. **Deploy:** Click **Create Web Service**. Render will give you a URL like  
   `https://smartendance-xxxx.onrender.com`

6. **Use this URL in Vercel:**  
   Set `NEXT_PUBLIC_API_URL` = `https://smartendance-xxxx.onrender.com` (no trailing slash) and redeploy the admin web.

---

## After deployment

1. **Backend URL:** Copy the URL from Railway or Render (e.g. `https://your-app.up.railway.app`).

2. **Vercel (admin web):**  
   **Settings** → **Environment Variables** → add  
   **Key:** `NEXT_PUBLIC_API_URL`  
   **Value:** your backend URL (no trailing slash, no `/api`).

3. **Redeploy** the frontend on Vercel so it uses the new variable.

4. **Test:** Open https://umapadelementaryschool.vercel.app and log in; the app will call your deployed backend via the proxy/rewrite.

---

## Optional: `server/package.json` start script

If the host runs `npm start`, add this to `server/package.json`:

```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js"
}
```

Then use **Start Command** `npm start` on Railway/Render.
